import { useRouter } from "next/router";

const ChatRoom = () => {
  const router = useRouter();
  const { id: roomName } = router.query;
  console.log(roomName);
  return (
    <div>
      <p>hello</p>
    </div>
  );
};

export default ChatRoom;
