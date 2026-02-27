import { Module } from '@nestjs/common';
import { ThingCrudController } from './thing.crud.controller';
import { ThingAccessQueryService } from './thing-access-query.service';

@Module({
  controllers: [ThingCrudController],
  providers: [ThingAccessQueryService],
})
export class ThingModule {}
