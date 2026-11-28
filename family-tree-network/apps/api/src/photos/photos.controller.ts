import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Put, Query, Res } from '@nestjs/common';
import { IsIn, IsString, MaxLength } from 'class-validator';
import type { Response } from 'express';
import { AuthUser, AuthUserParam, Public } from '../common/auth-user';
import { PhotosService } from './photos.service';

class PhotoDto {
  /** data:image/jpeg;base64,… (the app sends a 512×512 JPEG; 2 MB is the hard limit) */
  @IsString()
  @MaxLength(2_900_000)
  image: string;
}

class PhotoVisibilityDto {
  @IsIn(['PUBLIC', 'NETWORK', 'FAMILY', 'PRIVATE'])
  visibility: 'PUBLIC' | 'NETWORK' | 'FAMILY' | 'PRIVATE';
}

@Controller()
export class PhotosController {
  constructor(private readonly photos: PhotosService) {}

  @Put('profiles/me/photo')
  set(@AuthUserParam() user: AuthUser, @Body() dto: PhotoDto) {
    return this.photos.setOwn(user.userId, user.profileId, dto.image);
  }

  @Patch('profiles/me/photo')
  visibility(@AuthUserParam() user: AuthUser, @Body() dto: PhotoVisibilityDto) {
    return this.photos.setVisibility(user.userId, user.profileId, dto.visibility);
  }

  @HttpCode(200)
  @Delete('profiles/me/photo')
  remove(@AuthUserParam() user: AuthUser) {
    return this.photos.removeOwn(user.userId, user.profileId);
  }

  @Public()
  @Get('photos/:id')
  async read(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('v') v: string,
    @Query('exp') exp: string,
    @Query('sig') sig: string,
    @Res() res: Response,
  ) {
    const photo = await this.photos.read(id, v, exp, sig);
    res.set({
      'Content-Type': photo.mime,
      'Content-Length': String(photo.bytes),
      'Cache-Control': 'private, max-age=3600',
      'Cross-Origin-Resource-Policy': 'same-site',
      'Content-Disposition': 'inline',
    });
    res.end(photo.data);
  }
}
