import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

const COMMENTS_QUERY_KEY = 'comments';

// Types for comments
export interface CommentAuthor {
  id: string;
  name: string;
  email: string;
}

export interface Comment {
  id: string;
  content: string;
  assessmentId: string | null;
  parentId: string | null;
  authorId: string;
  author: CommentAuthor;
  mentions: string | null;
  mentionedUsers: CommentAuthor[];
  createdAt: string;
  updatedAt: string;
  replies?: Comment[];
  replyCount?: number;
}

export interface CreateCommentInput {
  content: string;
  assessmentId?: string;
  parentId?: string;
  mentions?: string[];
}

export interface UpdateCommentInput {
  content: string;
  mentions?: string[];
}

// Get comments for an assessment
export function useComments(assessmentId: string | undefined) {
  return useQuery<Comment[]>({
    queryKey: [COMMENTS_QUERY_KEY, assessmentId],
    queryFn: async () => {
      const { data } = await api.get('/comments', {
        params: { assessmentId },
      });
      return data;
    },
    enabled: !!assessmentId,
  });
}

// Get a single comment with thread
export function useComment(commentId: string | undefined) {
  return useQuery<Comment>({
    queryKey: [COMMENTS_QUERY_KEY, 'single', commentId],
    queryFn: async () => {
      const { data } = await api.get(`/comments/${commentId}`);
      return data;
    },
    enabled: !!commentId,
  });
}

// Create a new comment
export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation<Comment, Error, CreateCommentInput>({
    mutationFn: async (input) => {
      const { data } = await api.post('/comments', input);
      return data;
    },
    onSuccess: (data) => {
      // Invalidate the comments list for this assessment
      if (data.assessmentId) {
        queryClient.invalidateQueries({ queryKey: [COMMENTS_QUERY_KEY, data.assessmentId] });
      }
      // Also invalidate any parent comment thread
      if (data.parentId) {
        queryClient.invalidateQueries({ queryKey: [COMMENTS_QUERY_KEY, 'single', data.parentId] });
      }
    },
  });
}

// Update a comment
export function useUpdateComment() {
  const queryClient = useQueryClient();

  return useMutation<Comment, Error, { commentId: string; updates: UpdateCommentInput }>({
    mutationFn: async ({ commentId, updates }) => {
      const { data } = await api.put(`/comments/${commentId}`, updates);
      return data;
    },
    onSuccess: (data) => {
      if (data.assessmentId) {
        queryClient.invalidateQueries({ queryKey: [COMMENTS_QUERY_KEY, data.assessmentId] });
      }
      queryClient.invalidateQueries({ queryKey: [COMMENTS_QUERY_KEY, 'single', data.id] });
    },
  });
}

// Delete a comment
export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { commentId: string; assessmentId: string }>({
    mutationFn: async ({ commentId }) => {
      await api.delete(`/comments/${commentId}`);
    },
    onSuccess: (_, { assessmentId }) => {
      queryClient.invalidateQueries({ queryKey: [COMMENTS_QUERY_KEY, assessmentId] });
    },
  });
}

// Search users for @mentions
export function useSearchMentions(query: string) {
  return useQuery<CommentAuthor[]>({
    queryKey: [COMMENTS_QUERY_KEY, 'mentions', 'search', query],
    queryFn: async () => {
      const { data } = await api.get('/comments/mentions/search', {
        params: { query },
      });
      return data;
    },
    enabled: query.length >= 2,
  });
}

// Get comments where current user is mentioned
export function useMyMentions() {
  return useQuery<Comment[]>({
    queryKey: [COMMENTS_QUERY_KEY, 'user', 'mentioned'],
    queryFn: async () => {
      const { data } = await api.get('/comments/user/mentioned');
      return data;
    },
  });
}
