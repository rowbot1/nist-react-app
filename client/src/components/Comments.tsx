/**
 * Comments Component
 *
 * A threaded comment system for assessments with @mention support.
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Avatar,
  IconButton,
  Paper,
  Stack,
  Divider,
  CircularProgress,
  Alert,
  Menu,
  MenuItem,
  Chip,
  Tooltip,
  Collapse,
} from '@mui/material';
import {
  Send as SendIcon,
  Reply as ReplyIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import {
  useComments,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
  Comment,
  CommentAuthor,
} from '../hooks/useComments';
import { formatDistanceToNow } from 'date-fns';

interface CommentsProps {
  assessmentId: string;
  currentUserId: string;
}

// Single comment item component
interface CommentItemProps {
  comment: Comment;
  currentUserId: string;
  assessmentId: string;
  onReply: (parentId: string) => void;
  depth?: number;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  currentUserId,
  assessmentId,
  onReply,
  depth = 0,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showReplies, setShowReplies] = useState(true);

  const updateComment = useUpdateComment();
  const deleteComment = useDeleteComment();

  const isAuthor = comment.author.id === currentUserId;
  const hasReplies = comment.replies && comment.replies.length > 0;

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    setIsEditing(true);
    handleMenuClose();
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(comment.content);
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;

    try {
      await updateComment.mutateAsync({
        commentId: comment.id,
        updates: { content: editContent },
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update comment:', error);
    }
  };

  const handleDelete = async () => {
    handleMenuClose();
    if (window.confirm('Are you sure you want to delete this comment?')) {
      try {
        await deleteComment.mutateAsync({
          commentId: comment.id,
          assessmentId,
        });
      } catch (error) {
        console.error('Failed to delete comment:', error);
      }
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Box sx={{ ml: depth > 0 ? 4 : 0, mt: depth > 0 ? 1 : 2 }}>
      <Paper
        sx={{
          p: 2,
          bgcolor: depth > 0 ? 'grey.50' : 'background.paper',
          borderLeft: depth > 0 ? 3 : 0,
          borderColor: 'primary.light',
        }}
        elevation={depth > 0 ? 0 : 1}
      >
        <Box display="flex" gap={2}>
          <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem', bgcolor: 'primary.main' }}>
            {getInitials(comment.author.name)}
          </Avatar>

          <Box flex={1}>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Typography variant="subtitle2" component="span">
                  {comment.author.name}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ ml: 1 }}
                >
                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                </Typography>
              </Box>

              {isAuthor && (
                <IconButton size="small" onClick={handleMenuOpen}>
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              )}
            </Box>

            {isEditing ? (
              <Box sx={{ mt: 1 }}>
                <TextField
                  fullWidth
                  multiline
                  size="small"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  autoFocus
                />
                <Box display="flex" gap={1} mt={1}>
                  <Button size="small" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleSaveEdit}
                    disabled={updateComment.isPending || !editContent.trim()}
                  >
                    Save
                  </Button>
                </Box>
              </Box>
            ) : (
              <>
                <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
                  {comment.content}
                </Typography>

                {/* Mentioned users */}
                {comment.mentionedUsers && comment.mentionedUsers.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    {comment.mentionedUsers.map((user) => (
                      <Chip
                        key={user.id}
                        label={`@${user.name}`}
                        size="small"
                        sx={{ mr: 0.5, mb: 0.5 }}
                        color="primary"
                        variant="outlined"
                      />
                    ))}
                  </Box>
                )}

                {/* Actions */}
                <Box display="flex" gap={1} mt={1}>
                  <Button
                    size="small"
                    startIcon={<ReplyIcon />}
                    onClick={() => onReply(comment.id)}
                    sx={{ textTransform: 'none' }}
                  >
                    Reply
                  </Button>

                  {hasReplies && (
                    <Button
                      size="small"
                      startIcon={showReplies ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      onClick={() => setShowReplies(!showReplies)}
                      sx={{ textTransform: 'none' }}
                    >
                      {showReplies ? 'Hide' : 'Show'} {comment.replies!.length} {comment.replies!.length === 1 ? 'reply' : 'replies'}
                    </Button>
                  )}
                </Box>
              </>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Replies */}
      {hasReplies && (
        <Collapse in={showReplies}>
          {comment.replies!.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              assessmentId={assessmentId}
              onReply={onReply}
              depth={depth + 1}
            />
          ))}
        </Collapse>
      )}

      {/* Menu for edit/delete */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={handleEdit}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
};

// Main Comments component
const Comments: React.FC<CommentsProps> = ({ assessmentId, currentUserId }) => {
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const { data: comments, isLoading, error } = useComments(assessmentId);
  const createComment = useCreateComment();

  const handleSubmit = useCallback(async () => {
    if (!newComment.trim()) return;

    try {
      await createComment.mutateAsync({
        content: newComment,
        assessmentId: replyingTo ? undefined : assessmentId,
        parentId: replyingTo || undefined,
      });
      setNewComment('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Failed to create comment:', error);
    }
  }, [newComment, assessmentId, replyingTo, createComment]);

  const handleReply = useCallback((parentId: string) => {
    setReplyingTo(parentId);
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyingTo(null);
    setNewComment('');
  }, []);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">Failed to load comments</Alert>;
  }

  return (
    <Box>
      <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
        Comments ({comments?.length || 0})
      </Typography>

      {/* Comment input */}
      <Paper sx={{ p: 2, mb: 2 }} variant="outlined">
        {replyingTo && (
          <Alert
            severity="info"
            onClose={handleCancelReply}
            sx={{ mb: 2 }}
          >
            Replying to a comment
          </Alert>
        )}

        <TextField
          fullWidth
          multiline
          rows={2}
          placeholder={replyingTo ? 'Write a reply...' : 'Add a comment...'}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          size="small"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
              handleSubmit();
            }
          }}
        />

        <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
          <Typography variant="caption" color="text.secondary">
            Press Ctrl+Enter to submit
          </Typography>
          <Box display="flex" gap={1}>
            {replyingTo && (
              <Button size="small" onClick={handleCancelReply}>
                Cancel
              </Button>
            )}
            <Button
              variant="contained"
              size="small"
              endIcon={<SendIcon />}
              onClick={handleSubmit}
              disabled={!newComment.trim() || createComment.isPending}
            >
              {createComment.isPending ? 'Posting...' : 'Post'}
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Comments list */}
      {comments && comments.length > 0 ? (
        <Stack spacing={0}>
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={currentUserId}
              assessmentId={assessmentId}
              onReply={handleReply}
            />
          ))}
        </Stack>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
          No comments yet. Be the first to add one!
        </Typography>
      )}
    </Box>
  );
};

export default Comments;
