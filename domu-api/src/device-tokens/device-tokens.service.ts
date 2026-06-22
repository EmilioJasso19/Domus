import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceTokens } from './entities/device-tokens.entity';

@Injectable()
export class DeviceTokensService {
  constructor(
    @InjectRepository(DeviceTokens)
    private readonly repo: Repository<DeviceTokens>,
  ) {}

  async findByUserId(userId: string): Promise<DeviceTokens[]> {
    return this.repo.find({ where: { user_id: userId } });
  }

  // Alta/actualización idempotente: un mismo token solo puede pertenecer a un
  // usuario (constraint UNIQUE en expo_push_token); si reaparece, se reasigna.
  async register(
    userId: string,
    expoPushToken: string,
    platform: string,
  ): Promise<void> {
    await this.repo.upsert(
      { expo_push_token: expoPushToken, user_id: userId, platform },
      ['expo_push_token'],
    );
  }

  async deleteByToken(expoPushToken: string): Promise<void> {
    await this.repo.delete({ expo_push_token: expoPushToken });
  }
}
