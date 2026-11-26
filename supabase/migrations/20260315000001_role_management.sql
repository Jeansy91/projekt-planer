-- Allow admins to also update member roles (not just owner)
drop policy if exists "Owner or admin can update members" on public.project_members;
create policy "Owner or admin can update members"
  on public.project_members for update using (
    public.get_project_owner(project_id) = auth.uid()
    or exists (
      select 1 from public.project_members pm
      where pm.project_id = project_members.project_id
        and pm.user_id = auth.uid()
        and pm.role = 'admin'
    )
  );

-- RPC: Update a member's role (owner or admin only, cannot change own role)
create or replace function public.update_member_role(p_project_id uuid, p_user_id uuid, p_role text)
returns void as $$
begin
  -- Validate role
  if p_role not in ('viewer', 'editor', 'admin') then
    raise exception 'Invalid role';
  end if;

  -- Only owner or admin can change roles
  if not exists (
    select 1 from public.projects where id = p_project_id and owner_id = auth.uid()
  ) and not exists (
    select 1 from public.project_members where project_id = p_project_id and user_id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Not authorized';
  end if;

  -- Cannot change own role
  if p_user_id = auth.uid() then
    raise exception 'Cannot change own role';
  end if;

  -- Admins cannot change other admins' roles (only owner can)
  if exists (
    select 1 from public.project_members where project_id = p_project_id and user_id = p_user_id and role = 'admin'
  ) and not exists (
    select 1 from public.projects where id = p_project_id and owner_id = auth.uid()
  ) then
    raise exception 'Only owner can change admin roles';
  end if;

  update public.project_members
  set role = p_role
  where project_id = p_project_id and user_id = p_user_id;
end;
$$ language plpgsql security definer;

-- RPC: Transfer project ownership (owner only)
create or replace function public.transfer_ownership(p_project_id uuid, p_new_owner_id uuid)
returns void as $$
begin
  -- Only current owner can transfer
  if not exists (
    select 1 from public.projects where id = p_project_id and owner_id = auth.uid()
  ) then
    raise exception 'Only owner can transfer ownership';
  end if;

  -- New owner must be a current member
  if not exists (
    select 1 from public.project_members where project_id = p_project_id and user_id = p_new_owner_id
  ) then
    raise exception 'New owner must be a project member';
  end if;

  -- Transfer ownership
  update public.projects set owner_id = p_new_owner_id where id = p_project_id;

  -- Remove new owner from members table (they are now the owner)
  delete from public.project_members where project_id = p_project_id and user_id = p_new_owner_id;

  -- Add old owner as admin member
  insert into public.project_members (project_id, user_id, role)
  values (p_project_id, auth.uid(), 'admin')
  on conflict (project_id, user_id) do update set role = 'admin';
end;
$$ language plpgsql security definer;
