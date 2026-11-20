import { createRouter, createWebHistory } from 'vue-router'
import SubstationsListView from '../views/SubstationsListView.vue'
import SubstationDetailView from '../views/SubstationDetailView.vue'
import SubstationFormView from '../views/SubstationFormView.vue'
import NotFoundView from '../views/NotFoundView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/substations'
    },
    {
      path: '/substations',
      name: 'substations-list',
      component: SubstationsListView
    },
    {
      path: '/substations/new',
      name: 'substation-create',
      component: SubstationFormView
    },
    {
      path: '/substations/:id',
      name: 'substation-detail',
      component: SubstationDetailView
    },
    {
      path: '/substations/:id/edit',
      name: 'substation-edit',
      component: SubstationFormView
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: NotFoundView
    }
  ]
})

export default router