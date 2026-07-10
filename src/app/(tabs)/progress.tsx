import { appConfig } from '@/core/config';
import { ProgressScreen } from '@/features/progress/ProgressScreen';
import { ProgressOverviewScreen } from '@/features/progress/ProgressOverviewScreen';

export default appConfig.productExperience === 'consumer' ? ProgressOverviewScreen : ProgressScreen;
