import { HttpStatus, Injectable } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AppError } from '../common/errors.filter';
import { PrismaService } from '../prisma/prisma.service';
import { cleanImage } from './image-clean';
import { marker, photoPath, verifyPhotoLink, type PhotoVisibility } from './photo-url';

const MAX_BYTES = 2 * 1024 * 1024;

@Injectable()
export class PhotosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Sets the signed-in person's own photo (image as a data URL: JPEG or PNG). */
  async setOwn(userId: string, profileId: string, dataUrl: string) {
    const m = /^data:image\/(?:jpeg|png);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl.trim());
    if (!m) throw new AppError(HttpStatus.BAD_REQUEST, 'PHOTO_INVALID', 'Send a JPEG or PNG image');
    const raw = Buffer.from(m[1], 'base64');
    if (raw.length > MAX_BYTES) throw new AppError(HttpStatus.PAYLOAD_TOO_LARGE, 'PHOTO_TOO_LARGE', 'The photo is too large (max 2 MB)');
    const img = cleanImage(raw);
    if (!img) throw new AppError(HttpStatus.BAD_REQUEST, 'PHOTO_INVALID', 'This file is not a valid JPEG or PNG image');
    if (img.width < 64 || img.height < 64 || img.width > 4096 || img.height > 4096) {
      throw new AppError(HttpStatus.BAD_REQUEST, 'PHOTO_DIMENSIONS', 'The photo must be between 64 and 4096 pixels wide and high');
    }
    const existing = await this.prisma.profilePhoto.findUnique({ where: { profileId }, select: { version: true, visibility: true } });
    const version = (existing?.version ?? 0) + 1;
    const visibility = existing?.visibility ?? 'NETWORK';
    await this.prisma.$transaction([
      this.prisma.profilePhoto.upsert({
        where: { profileId },
        create: { profileId, mime: img.mime, data: img.data, bytes: img.data.length, version, visibility },
        update: { mime: img.mime, data: img.data, bytes: img.data.length, version },
      }),
      this.prisma.profile.update({ where: { id: profileId }, data: { avatarUrl: marker(version, visibility) } }),
    ]);
    await this.audit.log(userId, 'profile.photo_set', 'profile', profileId);
    return { avatarUrl: photoPath(profileId, marker(version, visibility)), visibility };
  }

  /** Who may see the photo: PUBLIC · NETWORK (default) · FAMILY · PRIVATE. */
  async setVisibility(userId: string, profileId: string, visibility: PhotoVisibility) {
    const photo = await this.prisma.profilePhoto.findUnique({ where: { profileId }, select: { version: true } });
    if (!photo) throw new AppError(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'No photo');
    await this.prisma.$transaction([
      this.prisma.profilePhoto.update({ where: { profileId }, data: { visibility } }),
      this.prisma.profile.update({ where: { id: profileId }, data: { avatarUrl: marker(photo.version, visibility) } }),
    ]);
    await this.audit.log(userId, 'profile.photo_visibility', 'profile', profileId, { visibility });
    return { visibility };
  }

  async removeOwn(userId: string, profileId: string) {
    await this.prisma.$transaction([
      this.prisma.profilePhoto.deleteMany({ where: { profileId } }),
      this.prisma.profile.update({ where: { id: profileId }, data: { avatarUrl: null } }),
    ]);
    await this.audit.log(userId, 'profile.photo_removed', 'profile', profileId);
    return { avatarUrl: null };
  }

  /** Serves a photo for a valid signed link; anything else looks like "not found". */
  async read(profileId: string, v: string, exp: string, sig: string) {
    const notFound = new AppError(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Not found');
    const version = verifyPhotoLink(profileId, v, exp, sig);
    if (version === null) throw notFound;
    const photo = await this.prisma.profilePhoto.findUnique({ where: { profileId } });
    if (!photo || photo.version !== version) throw notFound;
    return photo;
  }
}
