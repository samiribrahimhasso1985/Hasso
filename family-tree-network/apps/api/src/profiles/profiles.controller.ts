import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { AuthUser, AuthUserParam } from '../common/auth-user';
import { AddStewardDto, BlockDto, CreateManagedProfileDto, PrivacyDto, UpdateProfileDto } from './dto';
import { ProfilesService } from './profiles.service';

@Controller()
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  @Get('profiles/me')
  me(@AuthUserParam() user: AuthUser) {
    return this.profiles.get(user, user.profileId);
  }

  @Get('profiles/managed')
  managed(@AuthUserParam() user: AuthUser) {
    return this.profiles.managed(user);
  }

  @Get('profiles/search')
  search(@AuthUserParam() user: AuthUser, @Query('q') q = '') {
    return this.profiles.search(user, String(q).slice(0, 80));
  }

  @Post('profiles')
  createManaged(@AuthUserParam() user: AuthUser, @Body() dto: CreateManagedProfileDto) {
    return this.profiles.createManaged(user, dto);
  }

  @Get('profiles/:id')
  get(@AuthUserParam() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.profiles.get(user, id);
  }

  @Patch('profiles/:id')
  update(@AuthUserParam() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProfileDto) {
    return this.profiles.update(user, id, dto);
  }

  @Put('profiles/:id/privacy')
  privacy(@AuthUserParam() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: PrivacyDto) {
    return this.profiles.setPrivacy(user, id, dto);
  }

  @Post('profiles/:id/stewards')
  addSteward(@AuthUserParam() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: AddStewardDto) {
    return this.profiles.addSteward(user, id, dto);
  }

  @Post('blocks')
  block(@AuthUserParam() user: AuthUser, @Body() dto: BlockDto) {
    return this.profiles.block(user, dto.profileId);
  }

  @Delete('blocks/:profileId')
  unblock(@AuthUserParam() user: AuthUser, @Param('profileId', ParseUUIDPipe) profileId: string) {
    return this.profiles.unblock(user, profileId);
  }
}
