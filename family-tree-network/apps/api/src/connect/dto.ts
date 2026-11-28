import { IsBoolean, IsIn, IsOptional, IsUUID } from 'class-validator';
import type { ConnectAudience, PresenceMode } from '@prisma/client';

const AUD = ['EVERYONE', 'FRIENDS_OF_FRIENDS', 'FRIENDS', 'NOBODY', 'ONLY_ME'];

export class FriendRequestDto {
  @IsUUID() profileId: string;
}

/** CONNECT privacy settings; each field's allowed values are checked again in ConnectService (policy.ALLOWED). */
export class SettingsDto {
  @IsOptional() @IsIn(AUD) friendRequestsFrom?: ConnectAudience;
  @IsOptional() @IsIn(AUD) followsFrom?: ConnectAudience;
  @IsOptional() @IsIn(AUD) presenceVisibleTo?: ConnectAudience;
  @IsOptional() @IsIn(AUD) friendListVisibleTo?: ConnectAudience;
  @IsOptional() @IsBoolean() showLastSeen?: boolean;
  @IsOptional() @IsIn(['ONLINE', 'BUSY', 'AWAY', 'INVISIBLE']) statusMode?: PresenceMode;
}
