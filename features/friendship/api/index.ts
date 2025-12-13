import { supabase } from "@/app/lib/supabase";

// 1. フレンド申請を送る
export const requestFriend = async (myId: string, targetUserId: string) => {
  const { error } = await supabase.from("friendships").insert({
    user_id: myId, // 申請者＝自分
    friend_id: targetUserId, // 相手
    status: "pending", // 最初は承認待ち
  });

  if (error) throw new Error(error.message);
};

// 2. 申請を承認する（status を accepted に変える）
export const acceptFriendRequest = async (friendshipId: string) => {
  const { error } = await supabase
    .from("friendships")
    .update({ status: "accepted" })
    .eq("id", friendshipId);

  if (error) throw new Error(error.message);
};

// 3. フレンド一覧を取得する
export const getFriends = async (myId: string) => {
  // A. 「自分が申請して承認された」 または 「相手から申請されて承認した」 を探す
  const { data, error } = await supabase
    .from("friendships")
    .select(`
      id,
      user_id,
      friend_id,
      sender:profiles!friendships_user_id_fkey (id, username, avatar_url),
      receiver:profiles!friendships_friend_id_fkey (id, username, avatar_url)
    `)
    .eq("status", "accepted") // 承認済み限定
    .or(`user_id.eq.${myId},friend_id.eq.${myId}`); // どっちかに自分がいる

  if (error) throw new Error(error.message);

  // B. データ整形： 「自分じゃない方」を「友達」としてリストにする
  const formattedFriends = data
    .map((f) => {
      // 自分が申請者(user_id)なら、相手はreceiver
      if (f.user_id === myId) {
        return f.receiver ? { friendshipId: f.id, profile: f.receiver } : null;
      }
      // 自分が受信者(friend_id)なら、相手はsender
      else {
        return f.sender ? { friendshipId: f.id, profile: f.sender } : null;
      }
    })
    .filter(
      (
        f,
      ): f is {
        friendshipId: string;
        profile: { id: string; username: string; avatar_url: string | null };
      } => f !== null,
    );

  return formattedFriends;
};

// 4. 「自分への申請中」一覧を取得する（承認待ちリスト）
export const getPendingRequests = async (myId: string) => {
  const { data, error } = await supabase
    .from("friendships")
    .select(`
      id,
      sender:profiles!friendships_user_id_fkey (id, username, avatar_url)
    `)
    .eq("friend_id", myId) // 宛先が自分
    .eq("status", "pending"); // まだ保留中

  if (error) throw new Error(error.message);
  return data;
};

// 5. 指定ユーザーの達成率を取得する
export const getAchievementRate = async (targetUserId: string) => {
  const { data, error } = await supabase.rpc("get_achievement_rate", {
    target_user_id: targetUserId,
  });

  if (error) throw new Error(error.message);
  return data as number; // 0〜100の整数が返される
};
