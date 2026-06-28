import { RiskLevel } from '../types';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { notificationService } from '../services/notification.service';

interface DetectedObject {
  label: string;
  confidence: number;
  boundingBox: { x: number; y: number; w: number; h: number };
}

interface FraudFlag {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
}

interface AiAnalysisResult {
  detectedObjects: DetectedObject[];
  fraudFlags: FraudFlag[];
  duplicateScore: number;
  imageQualityScore: number;
  metadataValid: boolean;
  gpsValid: boolean;
  timestampValid: boolean;
  assetMatchScore: number;
  riskScore: number;
  riskLevel: RiskLevel;
  explanation: string;
}

const ASSET_CATEGORIES = [
  'Agricultural Tractor',
  'Two-Wheeler / Motorcycle',
  'Commercial Vehicle',
  'Electric Generator',
  'Industrial Machinery',
  'Shop / Business Inventory',
  'Office Furniture',
  'Electronics & Equipment',
  'Livestock / Cattle',
  'Agricultural Equipment',
  'Building & Construction Materials',
  'Business Assets',
  'Solar Panel System',
  'Water Pump & Irrigation Equipment',
  'Cold Storage Unit',
];

const FRAUD_FLAG_TEMPLATES: FraudFlag[] = [
  { type: 'DUPLICATE_IMAGE', severity: 'HIGH', description: 'Image hash matches a previously submitted proof in our database' },
  { type: 'EDITED_IMAGE', severity: 'HIGH', description: 'Pixel analysis reveals signs of digital editing or compositing' },
  { type: 'METADATA_TAMPERED', severity: 'MEDIUM', description: 'EXIF metadata has been stripped or modified after capture' },
  { type: 'STOCK_IMAGE', severity: 'HIGH', description: 'Reverse image search indicates this image may be sourced from the internet' },
  { type: 'LOW_QUALITY', severity: 'LOW', description: 'Image resolution and quality are below acceptable verification thresholds' },
  { type: 'GPS_MISMATCH', severity: 'HIGH', description: 'GPS coordinates do not match the borrower\'s registered address location' },
  { type: 'TIMESTAMP_SUSPICIOUS', severity: 'MEDIUM', description: 'Significant discrepancy detected between device timestamp and server receipt time' },
  { type: 'AI_GENERATED', severity: 'HIGH', description: 'Probabilistic analysis suggests this image may be AI-generated' },
];

function randFloat(min: number, max: number): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateDetectedObjects(loanPurpose: string): DetectedObject[] {
  // Try to match objects to loan purpose
  const purposeLower = loanPurpose.toLowerCase();
  let primaryLabel = pickRandom(ASSET_CATEGORIES);

  if (purposeLower.includes('tractor') || purposeLower.includes('farm')) {
    primaryLabel = 'Agricultural Tractor';
  } else if (purposeLower.includes('vehicle') || purposeLower.includes('truck') || purposeLower.includes('transport')) {
    primaryLabel = 'Commercial Vehicle';
  } else if (purposeLower.includes('cattle') || purposeLower.includes('livestock') || purposeLower.includes('dairy')) {
    primaryLabel = 'Livestock / Cattle';
  } else if (purposeLower.includes('shop') || purposeLower.includes('business') || purposeLower.includes('inventory')) {
    primaryLabel = 'Shop / Business Inventory';
  } else if (purposeLower.includes('construction') || purposeLower.includes('building')) {
    primaryLabel = 'Building & Construction Materials';
  } else if (purposeLower.includes('equipment') || purposeLower.includes('machinery')) {
    primaryLabel = 'Industrial Machinery';
  } else if (purposeLower.includes('solar')) {
    primaryLabel = 'Solar Panel System';
  }

  const count = randInt(1, 3);
  const objects: DetectedObject[] = [];

  for (let i = 0; i < count; i++) {
    objects.push({
      label: i === 0 ? primaryLabel : pickRandom(ASSET_CATEGORIES),
      confidence: randFloat(i === 0 ? 0.82 : 0.65, 0.98),
      boundingBox: {
        x: randInt(20, 200),
        y: randInt(20, 150),
        w: randInt(300, 600),
        h: randInt(200, 400),
      },
    });
  }

  return objects;
}

function generateFraudFlags(hasGps: boolean, imageQualityScore: number): FraudFlag[] {
  const flags: FraudFlag[] = [];

  // ~15% chance of GPS mismatch flag if no GPS
  if (!hasGps && Math.random() > 0.5) {
    flags.push({
      type: 'METADATA_TAMPERED',
      severity: 'MEDIUM',
      description: 'GPS coordinates are absent from image metadata, preventing location verification',
    });
  }

  // ~10% chance of a suspicious flag
  if (Math.random() < 0.1) {
    flags.push(pickRandom(FRAUD_FLAG_TEMPLATES.filter(f => f.type !== 'METADATA_TAMPERED')));
  }

  // Low quality flag if quality score is bad
  if (imageQualityScore < 65) {
    flags.push({
      type: 'LOW_QUALITY',
      severity: 'LOW',
      description: 'Image resolution and sharpness are below the recommended verification standard',
    });
  }

  return flags;
}

function calculateRiskScore(
  assetMatchScore: number,
  imageQualityScore: number,
  gpsValid: boolean,
  metadataValid: boolean,
  timestampValid: boolean,
  fraudFlags: FraudFlag[],
  duplicateScore: number
): number {
  // Higher score = higher risk (worse)
  let risk = 0;

  // Asset match contributes to low risk
  risk += (100 - assetMatchScore) * 0.30;
  risk += (100 - imageQualityScore) * 0.20;
  if (!gpsValid) risk += 20;
  if (!metadataValid) risk += 15;
  if (!timestampValid) risk += 10;

  // Each fraud flag adds risk
  for (const flag of fraudFlags) {
    if (flag.severity === 'HIGH') risk += 15;
    else if (flag.severity === 'MEDIUM') risk += 8;
    else risk += 3;
  }

  // Duplicate score (0-100, higher = more duplicate)
  risk += duplicateScore * 0.15;

  return Math.min(100, Math.max(0, Math.round(risk)));
}

function getRiskLevel(score: number): RiskLevel {
  if (score <= 30) return RiskLevel.LOW;
  if (score <= 60) return RiskLevel.MEDIUM;
  if (score <= 80) return RiskLevel.HIGH;
  return RiskLevel.CRITICAL;
}

function generateExplanation(
  detectedObjects: DetectedObject[],
  fraudFlags: FraudFlag[],
  riskScore: number,
  riskLevel: RiskLevel,
  gpsValid: boolean,
  loanPurpose: string
): string {
  const primaryObject = detectedObjects[0];
  const confidencePct = Math.round((primaryObject?.confidence || 0) * 100);
  const objectName = primaryObject?.label || 'unknown asset';

  let explanation = `AI analysis detected ${objectName} with ${confidencePct}% confidence, `;
  explanation += detectedObjects.length > 1
    ? `along with ${detectedObjects.length - 1} additional asset(s) in the frame. `
    : 'as the primary asset in the frame. ';

  explanation += `The declared loan purpose was "${loanPurpose}". `;

  if (gpsValid) {
    explanation += 'GPS coordinates were successfully extracted and validated against the borrower\'s registered address. ';
  } else {
    explanation += 'WARNING: GPS location data could not be verified, which limits geographical validation. ';
  }

  if (fraudFlags.length === 0) {
    explanation += 'No fraud indicators were detected. Image metadata appears authentic with no signs of manipulation. ';
  } else {
    explanation += `ALERT: ${fraudFlags.length} potential concern(s) detected — ${fraudFlags.map(f => f.type.replace(/_/g, ' ')).join(', ')}. `;
  }

  explanation += `Overall risk assessment: ${riskLevel} (${riskScore}/100). `;

  if (riskLevel === RiskLevel.LOW) {
    explanation += 'RECOMMENDATION: This upload appears genuine. Recommend approval after officer review.';
  } else if (riskLevel === RiskLevel.MEDIUM) {
    explanation += 'RECOMMENDATION: Moderate risk detected. Officer review recommended before approval.';
  } else if (riskLevel === RiskLevel.HIGH) {
    explanation += 'RECOMMENDATION: High risk detected. Request additional geotagged evidence before proceeding.';
  } else {
    explanation += 'RECOMMENDATION: Critical risk. Escalate for manual investigation before any approval.';
  }

  return explanation;
}

function simulateDelay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const mockAiService = {
  async processUpload(uploadId: string): Promise<void> {
    logger.info(`🤖 AI Processing started for upload: ${uploadId}`);

    try {
      // Update to PROCESSING
      const verification = await prisma.verification.findUnique({
        where: { uploadId },
        include: {
          upload: true,
          loan: { select: { purpose: true, borrowerId: true, officerId: true } },
        },
      });

      if (!verification) {
        logger.warn(`No verification found for upload ${uploadId}`);
        return;
      }

      await prisma.verification.update({
        where: { id: verification.id },
        data: { status: 'PROCESSING' },
      });

      // Simulate AI processing time (2-4 seconds)
      await simulateDelay(randInt(2000, 4000));

      // Generate AI results
      const hasGps = verification.upload.gpsLat !== null;
      const imageQualityScore = randFloat(55, 98);
      const duplicateScore = randFloat(0, 25);
      const metadataValid = hasGps ? Math.random() > 0.15 : Math.random() > 0.45;
      const timestampValid = Math.random() > 0.1;
      const gpsValid = hasGps && metadataValid;

      const detectedObjects = generateDetectedObjects(verification.loan.purpose);
      const fraudFlags = generateFraudFlags(hasGps, imageQualityScore);
      const assetMatchScore = randFloat(70, 99);

      const riskScore = calculateRiskScore(
        assetMatchScore,
        imageQualityScore,
        gpsValid,
        metadataValid,
        timestampValid,
        fraudFlags,
        duplicateScore
      );

      const riskLevel = getRiskLevel(riskScore);

      const explanation = generateExplanation(
        detectedObjects,
        fraudFlags,
        riskScore,
        riskLevel,
        gpsValid,
        verification.loan.purpose
      );

      // Store AI results
      await prisma.aiResult.create({
        data: {
          verificationId: verification.id,
          detectedObjects: JSON.stringify(detectedObjects),
          fraudFlags: JSON.stringify(fraudFlags),
          duplicateScore,
          imageQualityScore,
          metadataValid,
          gpsValid,
          timestampValid,
          assetMatchScore,
          riskScore,
          riskLevel,
          explanation,
        },
      });

      // Update verification status to AI_COMPLETE
      await prisma.verification.update({
        where: { id: verification.id },
        data: {
          status: 'AI_COMPLETE',
          processedAt: new Date(),
        },
      });

      // Notify loan officer
      if (verification.loan.officerId) {
        const riskEmoji = riskLevel === 'LOW' ? '🟢' : riskLevel === 'MEDIUM' ? '🟡' : riskLevel === 'HIGH' ? '🔴' : '🚨';
        await notificationService.createNotification(
          verification.loan.officerId,
          'AI_COMPLETE',
          `AI Analysis Complete ${riskEmoji}`,
          `Upload for loan requires review. Risk Score: ${riskScore}/100 (${riskLevel}). ${fraudFlags.length > 0 ? `${fraudFlags.length} fraud flag(s) detected.` : 'No fraud flags.'}`,
          { uploadId, verificationId: verification.id, riskScore, riskLevel }
        );
      }

      logger.info(`✅ AI Processing complete for upload ${uploadId}: ${riskLevel} risk (${riskScore}/100)`);
    } catch (error) {
      logger.error(`❌ AI Processing failed for upload ${uploadId}:`, error);

      // Set verification back to PENDING on failure
      const verification = await prisma.verification.findUnique({ where: { uploadId } });
      if (verification) {
        await prisma.verification.update({
          where: { id: verification.id },
          data: { status: 'PENDING' },
        });
      }
    }
  },

  async reprocessUpload(uploadId: string): Promise<void> {
    // Delete existing AI result and reprocess
    const verification = await prisma.verification.findUnique({
      where: { uploadId },
      include: { aiResult: true },
    });

    if (!verification) throw new Error('Verification not found');

    if (verification.aiResult) {
      await prisma.aiResult.delete({ where: { verificationId: verification.id } });
    }

    await this.processUpload(uploadId);
  },
};
