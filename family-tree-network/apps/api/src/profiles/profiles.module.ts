import { Module } from '@nestjs/common';
import { GraphModule } from '../graph/graph.module';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';

@Module({ imports: [GraphModule], controllers: [ProfilesController], providers: [ProfilesService] })
export class ProfilesModule {}
