import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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
    if (args.title.length > 200) {
      throw new Error("Title must be less than 200 characters");
    }
    if (args.description && args.description.length > 1000) {
      throw new Error("Description must be less than 1000 characters");
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
      const todos = await ctx.db
        .query("todos")
        .withIndex("by_completed", (q) =>
          q.eq("completed", args.completed!)
        )
        .order("desc")
        .take(limit);
      return todos;
    }

    const todos = await ctx.db
      .query("todos")
      .order("desc")
      .take(limit);
    return todos;
  },
});

export const getTodo = query({
  args: {
    todoId: v.id("todos"),
  },
  returns: v.union(
    v.object({
      _id: v.id("todos"),
      _creationTime: v.number(),
      title: v.string(),
      description: v.optional(v.string()),
      completed: v.boolean(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const todo = await ctx.db.get(args.todoId);
    return todo ?? null;
  },
});

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
      if (args.title.trim().length === 0) {
        throw new Error("Title cannot be empty");
      }
      if (args.title.length > 200) {
        throw new Error("Title must be less than 200 characters");
      }
      updateData.title = args.title.trim();
    }

    if (args.description !== undefined) {
      if (args.description && args.description.length > 1000) {
        throw new Error("Description must be less than 1000 characters");
      }
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

export const toggleTodoCompleted = mutation({
  args: {
    todoId: v.id("todos"),
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

    const newCompletedState = !existingTodo.completed;
    await ctx.db.patch(args.todoId, { completed: newCompletedState });

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
