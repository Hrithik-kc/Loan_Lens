import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import QRCode from 'qrcode';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import path from 'path';
import fs from 'fs';

export const reportService = {
  async generateReport(loanId: string, verificationId: string, userId: string) {
    const [loan, verification] = await Promise.all([
      prisma.loan.findUnique({
        where: { id: loanId },
        include: { borrower: true, officer: true },
      }),
      prisma.verification.findUnique({
        where: { id: verificationId },
        include: { aiResult: true, upload: { include: { location: true } } },
      }),
    ]);

    if (!loan) throw new AppError('Loan record not found', 404);
    if (!verification) throw new AppError('Verification record not found', 404);

    // 1. Generate validation QR code
    const valUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-report/${verificationId}`;
    const qrCodeDataUrl = await QRCode.toDataURL(valUrl);

    // 2. Mock a digital signature key
    const signatureHash = `LL-SIG-${verificationId.substring(0, 8)}-${userId.substring(0, 8)}-${Date.now().toString(36).toUpperCase()}`;

    // 3. Create PDF document using pdf-lib
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]);
    const { width, height } = page.getSize();

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Header Title
    page.drawText('LoanLens Utilization Verification Report', {
      x: 50,
      y: height - 60,
      size: 20,
      font: boldFont,
      color: rgb(30/255, 64/255, 175/255), // Primary Deep Blue
    });

    page.drawText('Smart AI Verification for Transparent Loan Utilization', {
      x: 50,
      y: height - 80,
      size: 11,
      font,
      color: rgb(100/255, 116/255, 139/255),
    });

    // Divider Line
    page.drawLine({
      start: { x: 50, y: height - 95 },
      end: { x: width - 50, y: height - 95 },
      thickness: 1,
      color: rgb(226/255, 232/255, 240/255),
    });

    // Metadata details
    const rowStart = height - 130;
    page.drawText('LOAN DETAILS', { x: 50, y: rowStart, size: 12, font: boldFont });
    page.drawText(`Loan Number: ${loan.loanNumber}`, { x: 50, y: rowStart - 20, size: 10, font });
    page.drawText(`Borrower: ${loan.borrower.name}`, { x: 50, y: rowStart - 35, size: 10, font });
    page.drawText(`Amount: Rs. ${loan.amount.toLocaleString('en-IN')}`, { x: 50, y: rowStart - 50, size: 10, font });
    page.drawText(`Purpose: ${loan.purpose.substring(0, 60)}...`, { x: 50, y: rowStart - 65, size: 10, font });

    page.drawText('VERIFICATION METRICS', { x: 320, y: rowStart, size: 12, font: boldFont });
    page.drawText(`Verification ID: ${verification.id.substring(0, 18)}...`, { x: 320, y: rowStart - 20, size: 10, font });
    page.drawText(`Status: ${verification.status}`, { x: 320, y: rowStart - 35, size: 10, font: boldFont });
    page.drawText(`Officer: ${loan.officer?.name || 'System / Unassigned'}`, { x: 320, y: rowStart - 50, size: 10, font });
    page.drawText(`Report Date: ${new Date().toLocaleDateString()}`, { x: 320, y: rowStart - 65, size: 10, font });

    // AI Results section
    const aiSectionY = height - 235;
    page.drawText('AI VISION RISK ASSESSMENT', { x: 50, y: aiSectionY, size: 12, font: boldFont });
    
    const riskScore = verification.aiResult?.riskScore ?? 0;
    const riskLevel = verification.aiResult?.riskLevel ?? 'LOW';
    page.drawText(`AI Risk Score: ${riskScore} / 100 (${riskLevel})`, { x: 50, y: aiSectionY - 20, size: 11, font: boldFont });
    
    // Draw explanation paragraph wrapped simple style
    const explanation = verification.aiResult?.explanation || 'No explanations generated.';
    const lines = explanation.match(/.{1,75}(\s|$)/g) || [explanation];
    let offset = 40;
    lines.slice(0, 4).forEach((line) => {
      page.drawText(line.trim(), { x: 50, y: aiSectionY - offset, size: 9, font });
      offset += 15;
    });

    // GPS Location Details
    const locationY = aiSectionY - 140;
    page.drawText('GEOTAG VALIDATION', { x: 50, y: locationY, size: 12, font: boldFont });
    const location = verification.upload.location;
    if (location) {
      page.drawText(`Latitude / Longitude: ${location.lat}, ${location.lng}`, { x: 50, y: locationY - 20, size: 10, font });
      page.drawText(`Calculated Distance: ${location.distanceKm} km from registration`, { x: 50, y: locationY - 35, size: 10, font });
      page.drawText(`Matched Registered Address: ${location.matchesBorrowerAddress ? 'YES' : 'NO'}`, { x: 50, y: locationY - 50, size: 10, font });
    } else {
      page.drawText('No geo-location information captured on verification assets.', { x: 50, y: locationY - 20, size: 10, font });
    }

    // Embed QR Code
    try {
      const qrImageBytes = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64');
      const qrImage = await pdfDoc.embedPng(qrImageBytes);
      page.drawImage(qrImage, {
        x: 460,
        y: 40,
        width: 90,
        height: 90,
      });
    } catch (err) {
      console.error('Failed to embed QR code in PDF:', err);
    }

    // Signatures footer
    const footerY = 120;
    page.drawLine({
      start: { x: 50, y: footerY + 15 },
      end: { x: width - 50, y: footerY + 15 },
      thickness: 1,
      color: rgb(226/255, 232/255, 240/255),
    });

    page.drawText('DIGITALLY SIGNED SECURE DOCUMENT', { x: 50, y: footerY - 10, size: 9, font: boldFont, color: rgb(16/255, 185/255, 129/255) }); // Emerald
    page.drawText(`Signature Key: ${signatureHash}`, { x: 50, y: footerY - 25, size: 8, font });
    page.drawText('Scan the QR code to verify this report online.', { x: 50, y: footerY - 40, size: 8, font });

    // Save PDF locally to public/reports folder for download
    const reportDir = path.join(process.cwd(), 'public', 'reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    const reportFileName = `report-${verificationId}.pdf`;
    const reportPath = path.join(reportDir, reportFileName);

    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(reportPath, pdfBytes);

    const baseUrl = process.env.APP_URL || 'http://localhost:4000';
    const pdfUrl = `${baseUrl}/reports/${reportFileName}`;

    // 4. Create database Report record
    return await prisma.report.create({
      data: {
        loanId,
        verificationId,
        generatedById: userId,
        pdfUrl,
        qrCode: qrCodeDataUrl,
        digitalSignature: signatureHash,
      },
    });
  },

  async getReport(id: string) {
    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        loan: { include: { borrower: true, officer: true } },
        verification: { include: { aiResult: true, upload: true } },
      },
    });
    if (!report) throw new AppError('Report not found', 404);
    return report;
  },

  async getReportsByLoan(loanId: string) {
    return await prisma.report.findMany({
      where: { loanId },
      orderBy: { createdAt: 'desc' },
    });
  }
};
