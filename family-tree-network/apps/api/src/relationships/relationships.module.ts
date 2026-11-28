import { Module } from '@nestjs/common';
import { GraphModule } from '../graph/graph.module';
import { RelationshipsController } from './relationships.controller';
import { RelationshipsService } from './relationships.service';

@Module({ imports: [GraphModule], controllers: [RelationshipsController], providers: [RelationshipsService], exports: [RelationshipsService] })
export class RelationshipsModule {}
