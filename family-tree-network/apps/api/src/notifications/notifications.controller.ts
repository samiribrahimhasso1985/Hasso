import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { AuthUser, AuthUserParam } from '../common/auth-user';
import { NotificationPrefsDto } from './dto';
import { NotificationsService } from './notifications.service';

/** Notification centre: history, unread count, read state, preferences (quiet hours, do not disturb, categories). */
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@AuthUserParam() user: AuthUser, @Query('before') before?: string, @Query('unread') unread?: string) {
    return this.notifications.list(user, { before, unread: unread === 'true' });
  }

  @Get('unread-count')
  async unread(@AuthUserParam() user: AuthUser) {
    return { unread: await this.notifications.unreadCount(user) };
  }

  @Post('read-all')
  @HttpCode(200)
  readAll(@AuthUserParam() user: AuthUser) {
    return this.notifications.markAllRead(user);
  }

  @Get('preferences')
  prefs(@AuthUserParam() user: AuthUser) {
    return this.notifications.preferences(user);
  }

  @Patch('preferences')
  updatePrefs(@AuthUserParam() user: AuthUser, @Body() dto: NotificationPrefsDto) {
    return this.notifications.updatePreferences(user, dto);
  }

  @Post(':id/read')
  @HttpCode(200)
  read(@AuthUserParam() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.notifications.markRead(user, id);
  }

  @Delete(':id')
  remove(@AuthUserParam() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.notifications.remove(user, id);
  }
}
