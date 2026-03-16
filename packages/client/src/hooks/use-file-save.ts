import { useMutation } from '@tanstack/react-query'

type FileSaveOptions = {
  basePath: 'files' | 'outputs'
}

export function useFileSave(options: FileSaveOptions = { basePath: 'files' }) {
  return useMutation({
    mutationFn: async ({ path, content }: { path: string; content: string }) => {
      const resp = await fetch(`/api/${options.basePath}/${path}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: { message: 'Unknown error' } }))
        throw new Error((err as { error: { message: string } }).error.message)
      }
      return resp.json()
    },
  })
}
