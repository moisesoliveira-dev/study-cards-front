import { useParams } from 'react-router-dom';
import DriveBrowserPage from '../../../shared/drive/DriveBrowserPage';

export default function SubjectDetailPage() {
  const { subjectId } = useParams<{ subjectId: string }>();
  return <DriveBrowserPage subjectId={subjectId} />;
}
