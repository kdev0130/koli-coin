// Script to deploy Firebase security rules
import { execSync } from 'child_process';

console.log('🚀 Deploying Firestore security rules...\n');

try {
  // Deploy only Firestore rules
  execSync('firebase deploy --only firestore:rules', {
    stdio: 'inherit',
    cwd: process.cwd()
  });
  
  console.log('\n✅ Firestore rules deployed successfully!');
} catch (error) {
  console.error('\n❌ Failed to deploy rules.');
  console.error('Make sure you have:');
  console.error('1. Firebase CLI installed: npm install -g firebase-tools');
  console.error('2. Logged in: firebase login');
  console.error('3. Initialized: firebase init');
  process.exit(1);
}
