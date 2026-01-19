# Convex + TanStack Router Integration Guide

A comprehensive guide on how Convex queries and mutations work with TanStack Router, including loaders, and how they differ from Prisma queries.

## Table of Contents

1. [Overview](#overview)
2. [Convex Queries vs Prisma Queries](#convex-queries-vs-prisma-queries)
3. [TanStack Router Loaders](#tanstack-router-loaders)
4. [Convex Integration Patterns](#convex-integration-patterns)
5. [Code Examples](#code-examples)
6. [Best Practices](#best-practices)
7. [Common Patterns](#common-patterns)

---

## Overview

### What is Convex?

Convex is a backend-as-a-service platform that provides:
- **Real-time database** with automatic reactivity
- **Serverless functions** (queries, mutations, actions)
- **Built-in authentication** and file storage
- **Type-safe APIs** with TypeScript
- **Automatic caching** and optimistic updates

### What is TanStack Router?

TanStack Router is a type-safe routing library that provides:
- **File-based routing**
- **Data loaders** for prefetching
- **Type-safe navigation**
- **Code splitting** and lazy loading

### Key Differences: Convex vs Prisma

| Feature | Convex | Prisma |
|---------|--------|--------|
| **Architecture** | Backend-as-a-Service | ORM (Object-Relational Mapping) |
| **Database** | Managed by Convex | Your own database (PostgreSQL, MySQL, etc.) |
| **Real-time** | Built-in, automatic | Requires additional setup (WebSockets, etc.) |
| **Queries** | Reactive, auto-updating | Manual refetching required |
| **Type Safety** | Generated from schema | Generated from schema |
| **Deployment** | Serverless, auto-scaling | Self-hosted or managed |
| **Caching** | Automatic | Manual (React Query, SWR, etc.) |

---

## Convex Queries vs Prisma Queries

### Convex Query Pattern

Convex queries are **reactive** and **real-time**. They automatically update when data changes.

```typescript
// convex/todos.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

export const listTodos = query({
  args: {
    completed: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("todos"),
      _creationTime: v.number(),
      title: v.string(),
      description: v.optional(v.string()),
      completed: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;
    
    if (args.completed !== undefined) {
      return await ctx.db
        .query("todos")
        .withIndex("by_completed", (q) =>
          q.eq("completed", args.completed!)
        )
        .order("desc")
        .take(limit);
    }
    
    return await ctx.db
      .query("todos")
      .order("desc")
      .take(limit);
  },
});
```

**Key Characteristics:**
- ✅ **Reactive**: Automatically updates when data changes
- ✅ **Type-safe**: Full TypeScript support with generated types
- ✅ **Serverless**: Runs on Convex's infrastructure
- ✅ **Cached**: Automatic caching and invalidation
- ✅ **Real-time**: Changes propagate instantly to all clients

### Prisma Query Pattern

Prisma queries are **imperative** and require manual refetching.

```typescript
// Using Prisma with React Query
import { useQuery } from "@tanstack/react-query";
import { prisma } from "@/lib/prisma";

// API Route (Next.js example)
// app/api/todos/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const completed = searchParams.get("completed");
  const limit = parseInt(searchParams.get("limit") || "100");

  const todos = await prisma.todo.findMany({
    where: completed !== null ? { completed: completed === "true" } : {},
    take: limit,
    orderBy: { createdAt: "desc" },
  });

  return Response.json(todos);
}

// Component
function TodoList() {
  const { data: todos, refetch } = useQuery({
    queryKey: ["todos"],
    queryFn: async () => {
      const response = await fetch("/api/todos");
      return response.json();
    },
  });

  // Manual refetch required after mutations
  const handleCreate = async () => {
    await fetch("/api/todos", { method: "POST", ... });
    refetch(); // Must manually refetch
  };

  return <div>{/* render todos */}</div>;
}
```

**Key Characteristics:**
- ❌ **Not reactive**: Requires manual refetching
- ✅ **Type-safe**: Generated types from Prisma schema
- ❌ **Manual caching**: Need React Query or similar
- ❌ **No real-time**: Requires WebSocket setup for real-time updates
- ✅ **Flexible**: Works with any database

---

## TanStack Router Loaders

### What are Loaders?

Loaders are functions that run **before** a route component renders. They're used to:
- Prefetch data
- Handle redirects
- Set up route context
- Validate authentication

### Loader Pattern with Convex

**❌ DON'T use loaders with Convex queries directly:**

```typescript
// ❌ This doesn't work well with Convex
export const Route = createFileRoute('/todos/')({
  component: RouteComponent,
  loader: async ({ context }) => {
    // This won't work - Convex queries need the Convex client
    const todos = await context.queryClient.fetchQuery(
      convexQuery(api.todos.listTodos, {})
    );
    return { todos };
  },
});
```

**✅ DO use `useSuspenseQuery` in components:**

```typescript
// ✅ Correct pattern
import { useSuspenseQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from 'convex/_generated/api';

export const Route = createFileRoute('/todos/')({
  component: RouteComponent,
});

function RouteComponent() {
  // Convex queries work best with useSuspenseQuery in components
  const { data: todos } = useSuspenseQuery(
    convexQuery(api.todos.listTodos, {})
  );

  return <div>{/* render todos */}</div>;
}
```

### Why Not Use Loaders with Convex?

1. **Convex is Reactive**: Convex queries automatically update when data changes. Loaders run once and don't benefit from reactivity.

2. **Convex Client Required**: Convex queries need the Convex client context, which is provided by `ConvexProvider` in the component tree.

3. **Real-time Updates**: Using `useSuspenseQuery` allows Convex to automatically push updates to your component.

### When to Use Loaders

Loaders are still useful for:
- **Static data** that doesn't change
- **Authentication checks**
- **Redirects** based on route params
- **Non-Convex data** (external APIs, etc.)

```typescript
// ✅ Good use case for loaders
export const Route = createFileRoute('/profile/$userId')({
  component: ProfileComponent,
  loader: async ({ params, context }) => {
    // Check authentication
    const user = await context.getUser();
    if (!user) {
      throw redirect({ to: '/login' });
    }

    // Validate user ID
    if (params.userId !== user.id) {
      throw redirect({ to: '/unauthorized' });
    }

    return { userId: params.userId };
  },
});
```

---

## Convex Integration Patterns

### Pattern 1: Query Data in Component

**Best for**: Most use cases, real-time data

```typescript
import { useSuspenseQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from 'convex/_generated/api';

function TodoList() {
  const { data: todos } = useSuspenseQuery(
    convexQuery(api.todos.listTodos, {})
  );

  return (
    <div>
      {todos.map((todo) => (
        <div key={todo._id}>{todo.title}</div>
      ))}
    </div>
  );
}
```

### Pattern 2: Mutation with Query Invalidation

**Best for**: Creating, updating, deleting data

```typescript
import { useMutation } from 'convex/react';
import { useQueryClient } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from 'convex/_generated/api';

function CreateTodoForm() {
  const queryClient = useQueryClient();
  const createTodo = useMutation(api.todos.createTodo);

  const handleSubmit = async (data: TodoFormData) => {
    try {
      await createTodo(data);
      
      // Invalidate and refetch todos
      queryClient.invalidateQueries({
        queryKey: convexQuery(api.todos.listTodos, {}).queryKey,
      });
    } catch (error) {
      console.error('Failed to create todo:', error);
    }
  };

  return <form onSubmit={handleSubmit}>{/* form fields */}</form>;
}
```

### Pattern 3: Conditional Queries

**Best for**: Filtering, pagination, dynamic queries

```typescript
import { useSuspenseQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from 'convex/_generated/api';

function FilteredTodoList({ filter }: { filter: 'all' | 'completed' | 'pending' }) {
  const { data: todos } = useSuspenseQuery(
    convexQuery(api.todos.listTodos, {
      completed: filter === 'all' ? undefined : filter === 'completed',
    })
  );

  return <div>{/* render todos */}</div>;
}
```

### Pattern 4: Optimistic Updates

**Best for**: Better UX, instant feedback

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from 'convex/_generated/api';

function TodoItem({ todo }: { todo: Todo }) {
  const queryClient = useQueryClient();
  const toggleTodo = useMutation(api.todos.toggleTodoCompleted);

  const handleToggle = async () => {
    // Optimistic update
    queryClient.setQueryData(
      convexQuery(api.todos.listTodos, {}).queryKey,
      (oldTodos: Todo[] | undefined) => {
        if (!oldTodos) return oldTodos;
        return oldTodos.map((t) =>
          t._id === todo._id ? { ...t, completed: !t.completed } : t
        );
      }
    );

    try {
      await toggleTodo({ todoId: todo._id });
    } catch (error) {
      // Revert on error
      queryClient.invalidateQueries({
        queryKey: convexQuery(api.todos.listTodos, {}).queryKey,
      });
    }
  };

  return <button onClick={handleToggle}>Toggle</button>;
}
```

---

## Code Examples

### Complete Example: Todo List with CRUD

#### 1. Convex Backend (`convex/todos.ts`)

```typescript
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// CREATE
export const createTodo = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    completed: v.boolean(),
  },
  returns: v.object({
    _id: v.id("todos"),
    _creationTime: v.number(),
    title: v.string(),
    description: v.optional(v.string()),
    completed: v.boolean(),
  }),
  handler: async (ctx, args) => {
    if (!args.title || args.title.trim().length === 0) {
      throw new Error("Title is required");
    }

    const todoId = await ctx.db.insert("todos", {
      title: args.title.trim(),
      description: args.description?.trim(),
      completed: args.completed,
    });

    const createdTodo = await ctx.db.get(todoId);
    if (!createdTodo) {
      throw new Error("Failed to create todo");
    }

    return {
      _id: createdTodo._id,
      _creationTime: createdTodo._creationTime,
      title: createdTodo.title,
      description: createdTodo.description,
      completed: createdTodo.completed,
    };
  },
});

// READ
export const listTodos = query({
  args: {
    completed: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("todos"),
      _creationTime: v.number(),
      title: v.string(),
      description: v.optional(v.string()),
      completed: v.boolean(),
    })
  ),
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100;

    if (args.completed !== undefined) {
      return await ctx.db
        .query("todos")
        .withIndex("by_completed", (q) =>
          q.eq("completed", args.completed!)
        )
        .order("desc")
        .take(limit);
    }

    return await ctx.db
      .query("todos")
      .order("desc")
      .take(limit);
  },
});

// UPDATE
export const updateTodo = mutation({
  args: {
    todoId: v.id("todos"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    completed: v.optional(v.boolean()),
  },
  returns: v.object({
    _id: v.id("todos"),
    _creationTime: v.number(),
    title: v.string(),
    description: v.optional(v.string()),
    completed: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const existingTodo = await ctx.db.get(args.todoId);
    if (!existingTodo) {
      throw new Error("Todo not found");
    }

    const updateData: {
      title?: string;
      description?: string;
      completed?: boolean;
    } = {};

    if (args.title !== undefined) {
      updateData.title = args.title.trim();
    }
    if (args.description !== undefined) {
      updateData.description = args.description?.trim();
    }
    if (args.completed !== undefined) {
      updateData.completed = args.completed;
    }

    await ctx.db.patch(args.todoId, updateData);

    const updatedTodo = await ctx.db.get(args.todoId);
    if (!updatedTodo) {
      throw new Error("Failed to update todo");
    }

    return {
      _id: updatedTodo._id,
      _creationTime: updatedTodo._creationTime,
      title: updatedTodo.title,
      description: updatedTodo.description,
      completed: updatedTodo.completed,
    };
  },
});

// DELETE
export const deleteTodo = mutation({
  args: {
    todoId: v.id("todos"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existingTodo = await ctx.db.get(args.todoId);
    if (!existingTodo) {
      throw new Error("Todo not found");
    }

    await ctx.db.delete(args.todoId);
    return null;
  },
});
```

#### 2. Frontend Component (`src/routes/todos/index.tsx`)

```typescript
import { createFileRoute } from '@tanstack/react-router';
import { useMutation } from 'convex/react';
import { useSuspenseQuery, useQueryClient } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from 'convex/_generated/api';

export const Route = createFileRoute('/todos/')({
  component: TodoListComponent,
});

function TodoListComponent() {
  const queryClient = useQueryClient();
  
  // Query todos - automatically reactive
  const { data: todos } = useSuspenseQuery(
    convexQuery(api.todos.listTodos, {})
  );

  // Mutations
  const createTodo = useMutation(api.todos.createTodo);
  const updateTodo = useMutation(api.todos.updateTodo);
  const deleteTodo = useMutation(api.todos.deleteTodo);

  const handleCreate = async (data: { title: string; description?: string }) => {
    try {
      await createTodo({
        title: data.title,
        description: data.description,
        completed: false,
      });
      
      // Invalidate to refetch
      queryClient.invalidateQueries({
        queryKey: convexQuery(api.todos.listTodos, {}).queryKey,
      });
    } catch (error) {
      console.error('Failed to create todo:', error);
    }
  };

  const handleUpdate = async (todoId: string, updates: Partial<Todo>) => {
    try {
      await updateTodo({ todoId, ...updates });
      
      queryClient.invalidateQueries({
        queryKey: convexQuery(api.todos.listTodos, {}).queryKey,
      });
    } catch (error) {
      console.error('Failed to update todo:', error);
    }
  };

  const handleDelete = async (todoId: string) => {
    try {
      await deleteTodo({ todoId });
      
      queryClient.invalidateQueries({
        queryKey: convexQuery(api.todos.listTodos, {}).queryKey,
      });
    } catch (error) {
      console.error('Failed to delete todo:', error);
    }
  };

  return (
    <div>
      <CreateTodoForm onSubmit={handleCreate} />
      <TodoList
        todos={todos}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
    </div>
  );
}
```

---

## Best Practices

### 1. Use `useSuspenseQuery` for Convex Queries

```typescript
// ✅ Good
const { data: todos } = useSuspenseQuery(
  convexQuery(api.todos.listTodos, {})
);

// ❌ Avoid
const { data: todos } = useQuery(
  convexQuery(api.todos.listTodos, {})
);
```

### 2. Invalidate Queries After Mutations

```typescript
// ✅ Good
await createTodo(data);
queryClient.invalidateQueries({
  queryKey: convexQuery(api.todos.listTodos, {}).queryKey,
});

// ❌ Avoid - data won't update
await createTodo(data);
```

### 3. Use Indexes for Filtered Queries

```typescript
// ✅ Good - uses index
export const listTodos = query({
  handler: async (ctx, args) => {
    return await ctx.db
      .query("todos")
      .withIndex("by_completed", (q) =>
        q.eq("completed", args.completed!)
      )
      .order("desc")
      .take(limit);
  },
});

// ❌ Avoid - table scan
export const listTodos = query({
  handler: async (ctx, args) => {
    const allTodos = await ctx.db.query("todos").collect();
    return allTodos.filter(t => t.completed === args.completed);
  },
});
```

### 4. Always Include Validators

```typescript
// ✅ Good
export const createTodo = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
  },
  returns: v.object({
    _id: v.id("todos"),
    title: v.string(),
  }),
  handler: async (ctx, args) => {
    // ...
  },
});

// ❌ Avoid - no type safety
export const createTodo = mutation({
  handler: async (ctx, args: any) => {
    // ...
  },
});
```

### 5. Handle Errors Gracefully

```typescript
// ✅ Good
const handleCreate = async (data: TodoFormData) => {
  try {
    await createTodo(data);
    queryClient.invalidateQueries({ ... });
  } catch (error) {
    console.error('Failed to create todo:', error);
    // Show user-friendly error message
    toast.error('Failed to create todo. Please try again.');
  }
};
```

---

## Common Patterns

### Pattern 1: Filtered List

```typescript
function FilteredTodoList() {
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending'>('all');
  
  const { data: todos } = useSuspenseQuery(
    convexQuery(api.todos.listTodos, {
      completed: filter === 'all' ? undefined : filter === 'completed',
    })
  );

  return (
    <div>
      <FilterButtons value={filter} onChange={setFilter} />
      <TodoList todos={todos} />
    </div>
  );
}
```

### Pattern 2: Pagination

```typescript
function PaginatedTodoList() {
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const { data: todos } = useSuspenseQuery(
    convexQuery(api.todos.listTodos, {
      limit: pageSize,
    })
  );

  const paginatedTodos = todos.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div>
      <TodoList todos={paginatedTodos} />
      <Pagination
        currentPage={page}
        totalPages={Math.ceil(todos.length / pageSize)}
        onPageChange={setPage}
      />
    </div>
  );
}
```

### Pattern 3: Optimistic Updates

```typescript
function TodoItem({ todo }: { todo: Todo }) {
  const queryClient = useQueryClient();
  const toggleTodo = useMutation(api.todos.toggleTodoCompleted);

  const handleToggle = async () => {
    // Optimistic update
    queryClient.setQueryData(
      convexQuery(api.todos.listTodos, {}).queryKey,
      (oldTodos: Todo[] | undefined) => {
        if (!oldTodos) return oldTodos;
        return oldTodos.map((t) =>
          t._id === todo._id ? { ...t, completed: !t.completed } : t
        );
      }
    );

    try {
      await toggleTodo({ todoId: todo._id });
    } catch (error) {
      // Revert on error
      queryClient.invalidateQueries({
        queryKey: convexQuery(api.todos.listTodos, {}).queryKey,
      });
      toast.error('Failed to update todo');
    }
  };

  return (
    <div>
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={handleToggle}
      />
      <span>{todo.title}</span>
    </div>
  );
}
```

---

## Summary

### Key Takeaways

1. **Convex queries are reactive** - They automatically update when data changes
2. **Don't use loaders with Convex** - Use `useSuspenseQuery` in components instead
3. **Always invalidate queries after mutations** - Ensures UI stays in sync
4. **Use indexes for filtered queries** - Better performance
5. **Include validators** - Type safety and runtime validation
6. **Handle errors gracefully** - Better user experience

### When to Use What

| Use Case | Solution |
|----------|----------|
| Real-time data | `useSuspenseQuery` with `convexQuery` |
| Create/Update/Delete | `useMutation` + query invalidation |
| Optimistic updates | `queryClient.setQueryData` |
| Static data | TanStack Router loaders |
| External APIs | TanStack Router loaders or `useQuery` |

---

## Resources

- [Convex Documentation](https://docs.convex.dev)
- [TanStack Router Documentation](https://tanstack.com/router)
- [TanStack Query Documentation](https://tanstack.com/query)
- [Convex + React Query Integration](https://github.com/get-convex/convex-react-query)

---

**Last Updated**: January 2025
