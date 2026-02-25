import { Module } from '@nestjs/common';
import { RocketsModule } from '@bitwild/rockets-server';
import { RocketsAuthModule } from '@bitwild/rockets-server-auth';

@Module({
  imports: [
    RocketsModule.forRoot({}),
    RocketsAuthModule.forRoot({}),
  ],
})
export class AppModule {}
