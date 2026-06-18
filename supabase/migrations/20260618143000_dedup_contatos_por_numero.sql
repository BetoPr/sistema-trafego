-- Junta contatos com o mesmo número (ex: registro @lid com histórico + registro
-- da agenda /contacts com número real) num só, mantendo histórico/etiquetas.
-- Chamada no fim da importação de contatos (idempotente).
create or replace function dedup_contatos_agencia(p_agencia uuid)
returns integer
language plpgsql
as $$
declare g record; canon uuid; dups uuid[]; total int := 0;
begin
  for g in
    select whatsapp from contatos
    where agencia_id=p_agencia and coalesce(whatsapp,'')<>'' and deleted_at is null
    group by whatsapp having count(*)>1
  loop
    -- canônico: mais tickets, depois wa_id real, depois mais antigo
    select c.id into canon
    from contatos c
    left join (select contato_id, count(*) n from tickets where agencia_id=p_agencia group by contato_id) tk on tk.contato_id=c.id
    where c.agencia_id=p_agencia and c.whatsapp=g.whatsapp and c.deleted_at is null
    order by coalesce(tk.n,0) desc, (c.wa_id like '%@s.whatsapp.net') desc, c.created_at asc
    limit 1;

    select array_agg(c.id) into dups from contatos c
    where c.agencia_id=p_agencia and c.whatsapp=g.whatsapp and c.deleted_at is null and c.id<>canon;
    if dups is null then continue; end if;

    update tickets set contato_id=canon where contato_id=any(dups);
    update asaas_cobrancas set contato_id=canon where contato_id=any(dups);
    update follow_up_avulsos set contato_id=canon where contato_id=any(dups);
    update follow_up_inscricoes set contato_id=canon where contato_id=any(dups);
    update ia_atendimento_followup_progresso set contato_id=canon where contato_id=any(dups);
    update ia_atendimento_log set contato_id=canon where contato_id=any(dups);
    update meta_leads set contato_id=canon where contato_id=any(dups);

    insert into contato_etiquetas (contato_id, etiqueta_id)
      select distinct canon, etiqueta_id from contato_etiquetas where contato_id=any(dups)
      on conflict (contato_id, etiqueta_id) do nothing;
    delete from contato_etiquetas where contato_id=any(dups);

    update contatos set nome=(select nome from contatos where id=any(dups||array[canon]) and nome ~ '[A-Za-zÀ-ÿ]' order by (id=canon) desc limit 1)
      where id=canon and (nome is null or nome !~ '[A-Za-zÀ-ÿ]') and exists (select 1 from contatos where id=any(dups) and nome ~ '[A-Za-zÀ-ÿ]');
    update contatos set foto_url=(select foto_url from contatos where id=any(dups) and foto_url is not null limit 1)
      where id=canon and foto_url is null;

    delete from contatos where id=any(dups);
    total := total + coalesce(array_length(dups,1),0);
  end loop;
  return total;
end $$;
