-- Function to check if an email is already registered (for login/register flow)
create or replace function public.check_email_exists(p_email text)
returns boolean
language plpgsql
security definer
as $$
begin
  return exists (select 1 from auth.users where email = p_email);
end;
$$;

-- Update handle_new_user to use display_name from user metadata if provided
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;
