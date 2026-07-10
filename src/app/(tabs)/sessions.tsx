import { appConfig } from '@/core/config';
import { AttemptHistoryScreen } from '@/features/sessions/AttemptHistoryScreen';
import { SessionsScreen } from '@/features/sessions/SessionsScreen';

export default appConfig.productExperience === 'consumer' ? AttemptHistoryScreen : SessionsScreen;
