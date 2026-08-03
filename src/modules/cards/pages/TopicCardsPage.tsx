import { useLocation, useParams } from 'react-router-dom';
import DriveBrowserPage from '../../../shared/drive/DriveBrowserPage';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function TopicCardsPage() {
  const { topicId } = useParams<{ topicId: string }>();
  const query = useQuery();
  const subjectId = query.get('subjectId');

  if (!subjectId || !topicId) {
    return null;
  }

  // key força remount ao trocar de pasta (IonRouterOutlet reutiliza a rota)
  return (
    <DriveBrowserPage
      key={`${subjectId}:${topicId}`}
      subjectId={subjectId}
      topicId={topicId}
    />
  );
}
