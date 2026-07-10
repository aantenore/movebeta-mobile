import { appConfig } from '@/core/config';
import { PrivacyScreen } from '@/features/privacy/PrivacyScreen';
import { ProductSettingsScreen } from '@/features/privacy/ProductSettingsScreen';

export default appConfig.productExperience === 'consumer' ? ProductSettingsScreen : PrivacyScreen;
