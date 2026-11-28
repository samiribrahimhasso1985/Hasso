import { Module } from '@nestjs/common';
import { GraphModule } from '../graph/graph.module';
import { IdentityController } from './identity.controller';
import { IdentityService } from './identity.service';

@Module({ imports: [GraphModule], controllers: [IdentityController], providers: [IdentityService] })
export class IdentityModule {}
