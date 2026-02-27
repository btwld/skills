import { Module } from '@nestjs/common';
import { RocketsModule } from '@bitwild/rockets-server';

@Module({
  imports: [
    RocketsModule.forRoot({
      authProvider: {} as never,
      userMetadata: {
        createDto: class UserMetadataCreateDto {},
        updateDto: class UserMetadataUpdateDto {},
      },
    }),
  ],
})
export class AppModule {}
