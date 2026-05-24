import { redirect } from 'next/navigation'

/** Manual registration wizard removed — review Survey123 submissions in the registry. */
export default function RegisterBoreholeRedirectPage() {
  redirect('/boreholes/registry')
}
