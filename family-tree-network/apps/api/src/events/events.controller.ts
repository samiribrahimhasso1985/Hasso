import { Body, Controller, DefaultValuePipe, Delete, Get, HttpCode, Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { AuthUser, AuthUserParam, Public } from '../common/auth-user';
import { CalendarService } from './calendar.service';
import { CalendarDateDto, CalendarDayDto, EventDto, ReviewDto, VerifyDto } from './dto';
import { EventsService } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get()
  list(
    @AuthUserParam() user: AuthUser,
    @Query('scope') scope?: string,
    @Query('category') category?: string,
    @Query('country') country?: string,
    @Query('page', new DefaultValuePipe(0), ParseIntPipe) page?: number,
  ) {
    return this.events.list(user, { scope, category, country, page });
  }

  @Post()
  create(@AuthUserParam() user: AuthUser, @Body() dto: EventDto) {
    return this.events.create(user, dto);
  }

  /** Shareable page of a public event — no account needed. */
  @Public()
  @Get('public/:id')
  publicOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.events.getPublic(id);
  }

  @Get(':id')
  one(@AuthUserParam() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.events.get(user, id);
  }

  @Patch(':id')
  update(@AuthUserParam() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: EventDto) {
    return this.events.update(user, id, dto);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  cancel(@AuthUserParam() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.events.cancel(user, id);
  }

  @Delete(':id')
  remove(@AuthUserParam() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.events.remove(user, id);
  }

  @Put(':id/save')
  save(@AuthUserParam() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.events.save(user, id, true);
  }

  @Delete(':id/save')
  unsave(@AuthUserParam() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.events.save(user, id, false);
  }

  @Put(':id/registration')
  register(@AuthUserParam() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.events.register(user, id);
  }

  @Delete(':id/registration')
  unregister(@AuthUserParam() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.events.unregister(user, id);
  }

  @Get(':id/attendees')
  attendees(@AuthUserParam() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.events.attendees(user, id);
  }

  @Post(':id/review')
  @HttpCode(200)
  review(@AuthUserParam() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ReviewDto) {
    return this.events.review(user, id, dto.approve, dto.note);
  }

  @Put(':id/feature')
  feature(@AuthUserParam() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.events.feature(user, id, true);
  }

  @Delete(':id/feature')
  unfeature(@AuthUserParam() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.events.feature(user, id, false);
  }
}

@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendar: CalendarService) {}

  /** Holy-day cards for now (the day before and on the day), in the viewer's time zone. Public. */
  @Public()
  @Get('today')
  today(@Query('tz') tz?: string) {
    return this.calendar.today(tz || 'UTC');
  }

  @Get()
  year(@AuthUserParam() user: AuthUser, @Query('year', new DefaultValuePipe(new Date().getUTCFullYear()), ParseIntPipe) year: number) {
    return this.calendar.year(user, year);
  }

  @Get('days/:slug')
  day(@AuthUserParam() user: AuthUser, @Param('slug') slug: string) {
    return this.calendar.day(user, slug);
  }

  @Post('days')
  createDay(@AuthUserParam() user: AuthUser, @Body() dto: CalendarDayDto) {
    return this.calendar.createDay(user, dto);
  }

  @Patch('days/:id')
  updateDay(@AuthUserParam() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CalendarDayDto) {
    return this.calendar.updateDay(user, id, dto);
  }

  @Post('days/:id/dates')
  addDate(@AuthUserParam() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CalendarDateDto) {
    return this.calendar.setDate(user, id, dto);
  }

  @Patch('days/:id/dates/:dateId')
  changeDate(@AuthUserParam() user: AuthUser, @Param('id', ParseUUIDPipe) id: string, @Param('dateId', ParseUUIDPipe) dateId: string, @Body() dto: CalendarDateDto) {
    return this.calendar.setDate(user, id, dto, dateId);
  }

  @Post('dates/:dateId/verify')
  @HttpCode(200)
  verify(@AuthUserParam() user: AuthUser, @Param('dateId', ParseUUIDPipe) dateId: string, @Body() dto: VerifyDto) {
    return this.calendar.verify(user, dateId, dto.verification);
  }

  @Delete('dates/:dateId')
  deleteDate(@AuthUserParam() user: AuthUser, @Param('dateId', ParseUUIDPipe) dateId: string) {
    return this.calendar.deleteDate(user, dateId);
  }
}
