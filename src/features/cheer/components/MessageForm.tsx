import { useState } from 'react'
import { Button, TextField, Label, Input, TextArea, Form, FieldError } from 'react-aria-components'

interface MessageFormProps {
  onSubmit: (text: string, senderName: string) => Promise<void>
  sending: boolean
  error: Error | null
}

/**
 * 応援メッセージ送信フォーム
 */
export function MessageForm({ onSubmit, sending, error }: MessageFormProps) {
  const [text, setText] = useState('')
  const [senderName, setSenderName] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    if (!text.trim()) {
      setLocalError('メッセージを入力してください')
      setSuccess(null)
      return
    }

    if (!senderName.trim()) {
      setLocalError('お名前を入力してください')
      setSuccess(null)
      return
    }

    try {
      await onSubmit(text.trim(), senderName.trim())
      setText('')
      // 名前は保持（連続送信しやすいように）
      setSuccess('応援メッセージを送信しました！')
      setTimeout(() => setSuccess(null), 3000)
    } catch {
      // エラーは親から渡される
    }
  }

  const displayError = localError || error?.message

  return (
    <div className="bg-white/90 rounded-2xl shadow-sm p-4 border border-white/60">
      <h2 className="text-sm font-semibold text-slate-900 mb-3">応援メッセージを送る</h2>

      <Form onSubmit={handleSubmit} className="space-y-3">
        <TextField className="flex flex-col gap-1" isRequired>
          <Label className="text-sm font-medium text-slate-700">お名前</Label>
          <Input
            value={senderName}
            onChange={(e) => {
              setSenderName(e.target.value)
              setLocalError(null)
              setSuccess(null)
            }}
            placeholder="応援者の名前"
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-white/80"
            disabled={sending}
          />
          <FieldError className="text-xs text-red-600" />
        </TextField>

        <TextField className="flex flex-col gap-1" isRequired>
          <Label className="text-sm font-medium text-slate-700">メッセージ</Label>
          <TextArea
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              setLocalError(null)
              setSuccess(null)
            }}
            placeholder="がんばれ！応援してるよ！"
            className="w-full min-h-[96px] px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-white/80"
            disabled={sending}
          />
          <FieldError className="text-xs text-red-600" />
        </TextField>

        {displayError && (
          <p className="text-sm text-red-600" role="alert">
            {displayError}
          </p>
        )}
        {success && !displayError && (
          <p className="text-sm text-emerald-600" role="status">
            {success}
          </p>
        )}

        <Button
          type="submit"
          isDisabled={sending}
          className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
        >
          {sending ? '送信中...' : '応援を送る'}
        </Button>
      </Form>
    </div>
  )
}
