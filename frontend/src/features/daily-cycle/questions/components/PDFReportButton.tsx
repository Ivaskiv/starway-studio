//
import { Button } from '@/ui';
import { downloadBlobAsFile } from '../utils/pdf.utils';
import { UserAnswer } from '../types/questions.types';
import { generatePDFReport } from '@/features/reportsPdf/services/pdf.service';

interface Props {
  userId: string;
  answers: UserAnswer[];
}

export const PDFReportButton = ({ userId, answers }: Props) => {
  const handleDownload = async () => {
    const pdfBlob = await generatePDFReport(userId, answers);
    downloadBlobAsFile(pdfBlob, `report_${userId}.pdf`);
  };

  return <Button onClick={handleDownload}>Завантажити звіт PDF</Button>;
};
