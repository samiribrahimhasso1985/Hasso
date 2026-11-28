import { Module } from '@nestjs/common';
import { GraphModule } from '../graph/graph.module';
import { RelationshipsModule } from '../relationships/relationships.module';
import { ConnectController } from './connect.controller';
import { ConnectService } from './connect.service';

@Module({ imports: [GraphModule, RelationshipsModule], controllers: [ConnectController], providers: [ConnectService] })
export class ConnectModule {}
