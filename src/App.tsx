import { Redirect, Route } from 'react-router-dom';
import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import SubjectsPage from './modules/subjects/pages/SubjectsPage';
import SubjectDetailPage from './modules/topics/pages/SubjectDetailPage';
import TopicCardsPage from './modules/cards/pages/TopicCardsPage';
import StudyPage from './modules/study/pages/StudyPage';

import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';
import './theme/fonts.css';
import './theme/variables.css';

setupIonicReact({ mode: 'md' });

const App: React.FC = () => (
  <IonApp>
    <IonReactRouter>
      <IonRouterOutlet>
        <Route exact path="/home" component={SubjectsPage} />
        <Route exact path="/subjects/:subjectId" component={SubjectDetailPage} />
        <Route exact path="/topics/:topicId" component={TopicCardsPage} />
        <Route exact path="/study/:topicId" component={StudyPage} />
        <Route exact path="/">
          <Redirect to="/home" />
        </Route>
      </IonRouterOutlet>
    </IonReactRouter>
  </IonApp>
);

export default App;
