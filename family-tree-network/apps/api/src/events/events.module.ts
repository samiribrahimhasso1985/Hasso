import { Module } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { CalendarController, EventsController } from './events.controller';
import { EventsService } from './events.service';
import { StaffService } from './staff';

/** EZIDINET Events & ÊZÎDÎ Calendar — one module for holy days and community events (no parallel systems). */
@Module({ controllers: [EventsController, CalendarController], providers: [EventsService, CalendarService, StaffService], exports: [EventsService, CalendarService] })
export class EventsModule {}
