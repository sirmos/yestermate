import { reddit } from '@devvit/web/server';

export const createPost = async () => {
  return await reddit.submitCustomPost({
    title: 'Yestermate: solve a daily puzzle with a stranger from yesterday',
  });
};