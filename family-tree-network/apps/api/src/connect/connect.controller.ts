import { Body, Controller, DefaultValuePipe, Delete, Get, HttpCode, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import type { Locale } from '@ftn/relationship-engine';
import { AuthUser, AuthUserParam } from '../common/auth-user';
import { ReqLocale } from '../common/locale';
import { ConnectService } from './connect.service';
import { FriendRequestDto, SettingsDto } from './dto';

/** EZIDINET CONNECT — Phase 1 (friends, followers, presence, discover, privacy). All routes need a session. */
@Controller('connect')
export class ConnectController {
  constructor(private readonly connect: ConnectService) {}

  @Get('home')
  home(@AuthUserParam() user: AuthUser) {
    return this.connect.home(user);
  }

  @Get('summary')
  summary(@AuthUserParam() user: AuthUser) {
    return this.connect.summary(user);
  }

  @Get('people/:id')
  person(@AuthUserParam() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.connect.person(user, id);
  }

  @Get('people/:id/friends')
  theirFriends(@AuthUserParam() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Query('page', new DefaultValuePipe(0), ParseIntPipe) page: number) {
    return this.connect.friends(user, id, page);
  }

  @Get('friends')
  friends(@AuthUserParam() user: AuthUser, @Query('page', new DefaultValuePipe(0), ParseIntPipe) page: number) {
    return this.connect.friends(user, user.profileId, page);
  }

  @Delete('friends/:profileId')
  removeFriend(@AuthUserParam() user: AuthUser, @Param('profileId', ParseUUIDPipe) id: string) {
    return this.connect.removeFriend(user, id);
  }

  @Post('friends/requests')
  send(@AuthUserParam() user: AuthUser, @Body() dto: FriendRequestDto, @ReqLocale() locale: Locale) {
    return this.connect.sendRequest(user, dto.profileId, locale);
  }

  @Get('friends/requests')
  requests(@AuthUserParam() user: AuthUser, @Query('direction') direction?: string) {
    return this.connect.requests(user, direction === 'outgoing' ? 'outgoing' : 'incoming');
  }

  @Post('friends/requests/:id/accept')
  @HttpCode(200)
  accept(@AuthUserParam() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @ReqLocale() locale: Locale) {
    return this.connect.respond(user, id, true, locale);
  }

  @Post('friends/requests/:id/reject')
  @HttpCode(200)
  reject(@AuthUserParam() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @ReqLocale() locale: Locale) {
    return this.connect.respond(user, id, false, locale);
  }

  @Delete('friends/requests/:id')
  cancel(@AuthUserParam() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.connect.cancel(user, id);
  }

  @Post('follows/:profileId')
  @HttpCode(200)
  follow(@AuthUserParam() user: AuthUser, @Param('profileId', ParseUUIDPipe) id: string) {
    return this.connect.follow(user, id);
  }

  @Delete('follows/:profileId')
  unfollow(@AuthUserParam() user: AuthUser, @Param('profileId', ParseUUIDPipe) id: string) {
    return this.connect.unfollow(user, id);
  }

  @Get('followers')
  followers(@AuthUserParam() user: AuthUser, @Query('page', new DefaultValuePipe(0), ParseIntPipe) page: number) {
    return this.connect.followList(user, 'followers', page);
  }

  @Get('following')
  following(@AuthUserParam() user: AuthUser, @Query('page', new DefaultValuePipe(0), ParseIntPipe) page: number) {
    return this.connect.followList(user, 'following', page);
  }

  @Get('discover')
  discover(@AuthUserParam() user: AuthUser, @Query('q') q?: string) {
    return this.connect.discover(user, q);
  }

  @Get('settings')
  settings(@AuthUserParam() user: AuthUser) {
    return this.connect.getSettings(user);
  }

  @Patch('settings')
  updateSettings(@AuthUserParam() user: AuthUser, @Body() dto: SettingsDto) {
    return this.connect.updateSettings(user, dto);
  }

  @Post('presence')
  @HttpCode(200)
  heartbeat(@AuthUserParam() user: AuthUser) {
    return this.connect.heartbeat(user);
  }
}
