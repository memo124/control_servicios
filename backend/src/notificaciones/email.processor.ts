import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { NotificacionesService, EmailJobData } from './notificaciones.service';

@Processor('email-notifications')
export class EmailProcessor extends WorkerHost {
  constructor(private notificaciones: NotificacionesService) {
    super();
  }

  async process(job: Job<EmailJobData>) {
    return this.notificaciones.processEmailJob(job.data);
  }
}
