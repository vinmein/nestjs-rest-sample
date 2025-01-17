import { Module } from '@nestjs/common';
import { UserReviewService } from './user-review.service';
import { UserReviewController } from './user-review.controller';
import { DatabaseModule } from 'database/database.module';
import { ProfileModule } from 'profile/profile.module';
import { AccountConfigModule } from 'account-config/account-config.module';
import { LoggerModule } from 'logger/logger.module';

@Module({
  imports: [ProfileModule, AccountConfigModule, DatabaseModule, LoggerModule],
  controllers: [UserReviewController],
  providers: [UserReviewService],
  exports:[UserReviewService]
})
export class UserReviewModule {}
