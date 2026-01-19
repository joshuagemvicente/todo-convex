import { createFileRoute } from '@tanstack/react-router'
import { revalidateLogic, useForm } from '@tanstack/react-form-start'
import { z } from 'zod'
import { useMutation } from 'convex/react'
import { useSuspenseQuery, useQueryClient } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { Input } from '~/components/ui/input'
import { Textarea } from '~/components/ui/textarea'
import { Checkbox } from '~/components/ui/checkbox'
import { Button } from '~/components/ui/button'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '~/components/ui/field'
import { api } from 'convex/_generated/api'
import { X } from 'lucide-react'
import { deleteTodo } from 'convex/todos'
import { Switch } from '~/components/ui/switch'

export const Route = createFileRoute('/todos/')({
  component: RouteComponent,
})

const todoSchema = z.object({
  title: z
    .string({ message: 'Title is required' })
    .trim()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters'),
  description: z
    .string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional(),
  completed: z.boolean(),
})


function RouteComponent() {
  const queryClient = useQueryClient()
  const { data: todos } = useSuspenseQuery(
    convexQuery(api.todos.listTodos, {})
  )
  const createTodoMutation = useMutation(api.todos.createTodo)
  const deleteTodoMutation = useMutation(api.todos.deleteTodo)

  const form = useForm({
    defaultValues: {
      title: '',
      description: '',
      completed: false,
    },
    validators: {
      onChange: ({ value }) => {
        const result = todoSchema.safeParse(value)
        if (!result.success) {
          return result.error.flatten().fieldErrors
        }
        return undefined
      },
    },
    validationLogic: revalidateLogic({
      mode: 'submit',
      modeAfterSubmission: 'blur',
    }),
    onSubmit: async ({ value }) => {
      const validatedData = todoSchema.parse(value)
      try {
        await createTodoMutation({
          title: validatedData.title,
          description: validatedData.description,
          completed: validatedData.completed,
        })
        form.reset()
        queryClient.invalidateQueries({
          queryKey: convexQuery(api.todos.listTodos, {}).queryKey,
        })
      } catch (error) {
        console.error('Failed to create todo:', error)
        throw error
      }
    },
  })

  const toggleTodoCompletedMutation = useMutation(api.todos.toggleTodoCompleted)

  return (
    <div className="w-full min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Create Todo</h1>
          <p className="text-muted-foreground mt-2">
            Add a new task to your todo list
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            form.handleSubmit()
          }}
          className="space-y-6"
        >
          <form.Field
            name="title"
            validators={{
              onChange: ({ value }) => {
                if (!value || value.trim().length === 0) {
                  return 'Title is required'
                }
                if (value.length > 200) {
                  return 'Title must be less than 200 characters'
                }
                return undefined
              },
            }}
          >
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Title</FieldLabel>
                <FieldContent>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    aria-invalid={field.state.meta.errors.length > 0}
                    aria-describedby={
                      field.state.meta.errors.length > 0
                        ? `${field.name}-error`
                        : undefined
                    }
                    placeholder="Enter todo title"
                  />
                  {field.state.meta.errors.length > 0 && (
                    <FieldError id={`${field.name}-error`}>
                      {field.state.meta.errors
                        .map((error) =>
                          typeof error === 'string' ? error : String(error)
                        )
                        .join(', ')}
                    </FieldError>
                  )}
                </FieldContent>
              </Field>
            )}
          </form.Field>

          <form.Field
            name="description"
            validators={{
              onChange: ({ value }) => {
                if (value && value.length > 1000) {
                  return 'Description must be less than 1000 characters'
                }
                return undefined
              },
            }}
          >
            {(field) => (
              <Field>
                <FieldLabel htmlFor={field.name}>Description</FieldLabel>
                <FieldDescription>
                  Optional description for your todo item
                </FieldDescription>
                <FieldContent>
                  <Textarea
                    id={field.name}
                    name={field.name}
                    value={field.state.value || ''}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    aria-invalid={field.state.meta.errors.length > 0}
                    aria-describedby={
                      field.state.meta.errors.length > 0
                        ? `${field.name}-error`
                        : undefined
                    }
                    placeholder="Enter todo description (optional)"
                    rows={4}
                  />
                  {field.state.meta.errors.length > 0 && (
                    <FieldError id={`${field.name}-error`}>
                      {field.state.meta.errors
                        .map((error) =>
                          typeof error === 'string' ? error : String(error)
                        )
                        .join(', ')}
                    </FieldError>
                  )}
                </FieldContent>
              </Field>
            )}
          </form.Field>

          <form.Field name="completed">
            {(field) => (
              <Field orientation="horizontal">
                <FieldContent>
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id={field.name}
                      name={field.name}
                      checked={field.state.value}
                      onCheckedChange={(checked) =>
                        field.handleChange(checked === true)
                      }
                      onBlur={field.handleBlur}
                      aria-invalid={field.state.meta.errors.length > 0}
                      aria-describedby={
                        field.state.meta.errors.length > 0
                          ? `${field.name}-error`
                          : undefined
                      }
                    />
                    <FieldLabel htmlFor={field.name} className="cursor-pointer">
                      Mark as completed
                    </FieldLabel>
                  </div>
                  {field.state.meta.errors.length > 0 && (
                    <FieldError id={`${field.name}-error`}>
                      {field.state.meta.errors
                        .map((error) =>
                          typeof error === 'string' ? error : String(error)
                        )
                        .join(', ')}
                    </FieldError>
                  )}
                </FieldContent>
              </Field>
            )}
          </form.Field>

          <form.Subscribe
            selector={(state) => ({
              canSubmit: state.canSubmit,
              isSubmitting: state.isSubmitting,
              isValid: state.isValid,
            })}
          >
            {({ canSubmit, isSubmitting, isValid }) => (
              <FieldGroup>
                <div className="flex gap-3 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => form.reset()}
                    disabled={isSubmitting}
                  >
                    Reset
                  </Button>
                  <Button
                    type="submit"
                    disabled={!canSubmit || isSubmitting || !isValid}
                  >
                    {isSubmitting ? 'Creating...' : 'Create Todo'}
                  </Button>
                </div>
              </FieldGroup>
            )}
          </form.Subscribe>
        </form>
        <div className="mt-12">
          <h2 className="text-2xl font-bold tracking-tight mb-4">Your Todos</h2>
          {todos.length === 0 ? (
            <p className="text-muted-foreground">No todos yet. Create one above!</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {todos.map((todo) => (
                <div
                  key={todo._id}
                  className="border rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3
                        className={`text-lg font-semibold ${
                          todo.completed
                            ? 'line-through text-muted-foreground'
                            : ''
                        }`}
                      >
                        {todo.title}
                      </h3>
                      {todo.description && (
                        <p className="text-muted-foreground mt-1">
                          {todo.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          todo.completed
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                        }`}
                      >
                        {todo.completed ? 'Completed' : 'Pending'}
                      </span>
                    </div>
                  </div>
                  <Switch checked={todo.completed} onCheckedChange={() => toggleTodoCompletedMutation({ todoId: todo._id })} />
                  <Button onClick={() => deleteTodoMutation({ todoId: todo._id })} variant="destructive" className="size-6" ><X className="size-4" /></Button>
                </div>
              ))}


            </div>
          )}
        </div>
      </div>
    </div>
  )
}
