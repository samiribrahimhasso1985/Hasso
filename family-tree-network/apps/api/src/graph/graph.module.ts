import { Module } from '@nestjs/common';
import { GraphController } from './graph.controller';
import { GraphLoader } from './graph-loader.service';
import { GraphService } from './graph.service';

@Module({ controllers: [GraphController], providers: [GraphLoader, GraphService], exports: [GraphLoader] })
export class GraphModule {}
