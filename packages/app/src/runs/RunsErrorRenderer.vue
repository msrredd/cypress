<template>
  <RunsError
    v-if="currentProject?.cloudProject?.__typename === 'CloudProjectNotFound'"
    icon="error"
    :button-text="t('runs.errors.notfound.button')"
    :button-icon="ConnectIcon"
    :message="t('runs.errors.notfound.title')"
    @button-click="showConnectDialog = true"
  >
    <i18n-t keypath="runs.errors.notfound.description">
      <CodeTag
        bg
        class="bg-purple-50 text-purple-500"
      >
        projectId: "{{ currentProject?.projectId }}"
      </CodeTag>
    </i18n-t>
  </RunsError>
  <template v-else-if="currentProject?.cloudProject?.__typename === 'CloudProjectUnauthorized'">
    <RunsError
      v-if="currentProject.cloudProject.hasRequestedAccess"
      icon="access"
      :button-text="t('runs.errors.unauthorizedRequested.button')"
      :button-icon="SendIcon"
      :message="t('runs.errors.unauthorizedRequested.title')"
      button-disabled
    >
      {{ t('runs.errors.unauthorizedRequested.description') }}
    </RunsError>
    <RunsError
      v-else
      icon="access"
      :button-text="t('runs.errors.unauthorized.button')"
      :button-icon="SendIcon"
      :message="t('runs.errors.unauthorized.title')"
      @button-click="requestAccess"
    >
      {{ t('runs.errors.unauthorized.description') }}
    </RunsError>
  </template>
  <CloudConnectModals
    v-if="showConnectDialog"
    :show="showConnectDialog"
    :gql="props.gql"
    @cancel="showConnectDialog = false"
    @success="showConnectDialog = false"
  />
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'
import { gql, useMutation } from '@urql/vue'
import RunsError from './RunsError.vue'
import { RunsErrorRendererFragment, RunsErrorRenderer_RequestAccessDocument } from '../generated/graphql'
import ConnectIcon from '~icons/cy/chain-link_x16.svg'
import SendIcon from '~icons/cy/paper-airplane_x16.svg'
import { useI18n } from '@cy/i18n'
import CodeTag from '../../../frontend-shared/src/components/CodeTag.vue'
import CloudConnectModals from './modals/CloudConnectModals.vue'

const { t } = useI18n()

gql`
fragment RunsErrorRenderer on Query {
  currentProject {  
    id
    projectId
    cloudProject {
      __typename
      ... on CloudProjectNotFound {
        message
      }
      ... on CloudProjectUnauthorized {
        message
        hasRequestedAccess
      }
    }
  }
  ...CloudConnectModals
}
`

const props = defineProps<{
  gql: RunsErrorRendererFragment
}>()

const currentProject = computed(() => props.gql.currentProject)

const showConnectDialog = ref(false)

gql`
mutation RunsErrorRenderer_RequestAccess( $projectId: String! ) {
  cloudProjectRequestAccess(projectSlug: $projectId)
}
`

const requestAccessMutation = useMutation(RunsErrorRenderer_RequestAccessDocument)

function requestAccess () {
  const projectId = props.gql.currentProject?.projectId

  if (projectId) {
    requestAccessMutation.executeMutation({ projectId })
  }
}

</script>