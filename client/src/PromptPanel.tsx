import { useState } from 'react'
import { Message } from './types'

interface PromptPanelProps {
  onPromptSubmit: (prompt: string) => void
  onResetConversation: () => void
  onViewSnapshot: (messageId: string) => void
  onRevertSnapshot: (messageId: string) => void
  messages: Message[]
  isProcessing: boolean
  viewingSnapshotId: string | null
}

export function PromptPanel({ onPromptSubmit, onResetConversation, onViewSnapshot, onRevertSnapshot, messages, isProcessing, viewingSnapshotId }: PromptPanelProps) {
  const [input, setInput] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !isProcessing) {
      onPromptSubmit(input.trim())
      setInput('')
    }
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: '#1e1e1e',
      borderRight: '1px solid #333'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #333',
        color: '#d4d4d4',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>AI Scene Generator</h2>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#888' }}>
            Describe what you want to create
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={onResetConversation}
            disabled={isProcessing}
            style={{
              padding: '6px 12px',
              backgroundColor: isProcessing ? '#555' : '#d32f2f',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              fontWeight: 600
            }}
            title="Reset conversation and start fresh"
          >
            Reset
          </button>
        )}
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {messages.length === 0 ? (
          <div style={{
            color: '#888',
            fontSize: '14px',
            textAlign: 'center',
            marginTop: '40px'
          }}>
            <p>Start by describing your scene...</p>
            <p style={{ fontSize: '12px', marginTop: '8px' }}>
              Example: "Create a red cube floating at position 8, 2, 8"
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const isViewing = viewingSnapshotId === message.id
            return (
              <div
                key={message.id}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: isViewing ? '#1e3a5f' : (message.role === 'user' ? '#2d2d30' : '#1a1a1a'),
                  border: `1px solid ${isViewing ? '#4a90e2' : (message.role === 'user' ? '#3e3e42' : '#2d2d30')}`,
                  color: '#d4d4d4',
                  fontSize: '14px',
                  lineHeight: '1.5'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '4px'
                }}>
                  <div style={{
                    fontSize: '11px',
                    color: '#888',
                    fontWeight: 600,
                    textTransform: 'uppercase'
                  }}>
                    {message.role === 'user' ? 'You' : 'AI'}
                  </div>
                  {message.role === 'assistant' && (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => onViewSnapshot(message.id)}
                        disabled={isProcessing || isViewing}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: isViewing ? '#555' : '#007acc',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: isProcessing || isViewing ? 'not-allowed' : 'pointer',
                          fontSize: '10px',
                          fontWeight: 600
                        }}
                        title={isViewing ? 'Currently viewing' : 'View files at this point'}
                      >
                        {isViewing ? 'Viewing' : 'View'}
                      </button>
                      <button
                        onClick={() => onRevertSnapshot(message.id)}
                        disabled={isProcessing}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: isProcessing ? '#555' : '#d32f2f',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: isProcessing ? 'not-allowed' : 'pointer',
                          fontSize: '10px',
                          fontWeight: 600
                        }}
                        title="Revert to this snapshot"
                      >
                        Revert
                      </button>
                    </div>
                  )}
                </div>
                {message.content}
              </div>
            )
          })
        )}
        {isProcessing && (
          <div style={{
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: '#1a1a1a',
            border: '1px solid #2d2d30',
            color: '#888',
            fontSize: '14px'
          }}>
            Processing...
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} style={{
        padding: '16px',
        borderTop: '1px solid #333'
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your scene changes..."
            disabled={isProcessing}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: '#2d2d30',
              border: '1px solid #3e3e42',
              borderRadius: '6px',
              color: '#d4d4d4',
              fontSize: '14px',
              outline: 'none'
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isProcessing}
            style={{
              padding: '12px 24px',
              backgroundColor: input.trim() && !isProcessing ? '#007acc' : '#555',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: input.trim() && !isProcessing ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: 600
            }}
          >
            Send
          </button>
        </div>
      </form>
    </div>
  )
}
