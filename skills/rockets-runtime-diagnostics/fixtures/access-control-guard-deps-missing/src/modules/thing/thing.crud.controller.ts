import { UseGuards } from '@nestjs/common';
import { AccessControlGuard } from '@concepta/nestjs-access-control';

@UseGuards(AccessControlGuard)
export class ThingCrudController {}
