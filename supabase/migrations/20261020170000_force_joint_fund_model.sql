-- Couples only use shared/personal pockets (bolsillos). Remove P2P split models.
UPDATE public.families
SET
  financial_model = 'joint_fund',
  user_1_split_pct = 50
WHERE financial_model IS DISTINCT FROM 'joint_fund'
   OR user_1_split_pct IS DISTINCT FROM 50;
