CREATE FUNCTION public.notify_chat_change() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  sender integer;
  recipient integer;
BEGIN
  IF TG_TABLE_NAME = 'direct_messages' THEN
    IF TG_OP = 'DELETE' THEN
      sender := OLD.sender_id;
      recipient := OLD.recipient_id;
    ELSE
      sender := NEW.sender_id;
      recipient := NEW.recipient_id;
    END IF;
  ELSE
    SELECT sender_id, recipient_id INTO sender, recipient
    FROM public.direct_messages
    WHERE id = CASE WHEN TG_OP = 'DELETE' THEN OLD.message_id ELSE NEW.message_id END;
  END IF;

  -- On cascading reaction deletes, the deleted message already notifies both members.
  IF sender IS NOT NULL THEN
    PERFORM pg_notify('unprompted_chat', sender::text);
    PERFORM pg_notify('unprompted_chat', recipient::text);
  END IF;
  RETURN NULL;
END
$$;
--> statement-breakpoint
CREATE TRIGGER direct_messages_notify_chat_change
AFTER INSERT OR UPDATE OR DELETE ON public.direct_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_chat_change();
--> statement-breakpoint
CREATE TRIGGER direct_message_reactions_notify_chat_change
AFTER INSERT OR UPDATE OR DELETE ON public.direct_message_reactions
FOR EACH ROW EXECUTE FUNCTION public.notify_chat_change();
