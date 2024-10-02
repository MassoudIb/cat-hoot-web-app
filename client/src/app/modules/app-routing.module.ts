import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminPageComponent } from '@app/pages/admin-page/admin-page.component';
import { CreateGamePageComponent } from '@app/pages/create-game-page/create-game-page.component';
import { HostPageComponent } from '@app/pages/host-page/host-page.component';
import { MainPageComponent } from '@app/pages/main-page/main-page.component';
import { OrganizerWaitingPageComponent } from '@app/pages/organizer-waiting-page/organizer-waiting-page.component';
import { PlayerPageComponent } from '@app/pages/player-page/player-page.component';
import { ResultsGamePageComponent } from '@app/pages/results-game-page/results-game-page.component';
import { WaitingPageComponent } from '@app/pages/waiting-page/waiting-page.component';

const routes: Routes = [
    { path: '', redirectTo: '/home', pathMatch: 'full' },
    { path: 'home', component: MainPageComponent },
    { path: 'admin', component: AdminPageComponent },
    { path: 'createGame', component: CreateGamePageComponent },
    { path: 'vueAttente', component: WaitingPageComponent },
    { path: 'vueAttenteOrg/:quizId', component: OrganizerWaitingPageComponent },
    { path: 'player/:quizId', component: PlayerPageComponent },
    { path: 'player', component: PlayerPageComponent },
    { path: 'resultsGame', component: ResultsGamePageComponent },
    { path: 'hostVue/:roomCode/:quizId', component: HostPageComponent },
    { path: '**', redirectTo: '/home' },
];

@NgModule({
    imports: [RouterModule.forRoot(routes, { useHash: true })],
    exports: [RouterModule],
})
export class AppRoutingModule {}
