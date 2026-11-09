// 모임 데이터가 바뀌었을 때 관련 쿼리를 한 번에 새로고침
// 쿼리 키 규칙: ['groups'], ['group', id], ['expenses', id], ['settlement', id], ['stats', id]
export function invalidateGroup(queryClient, groupId) {
  const id = Number(groupId);
  queryClient.invalidateQueries({ queryKey: ['groups'] });
  ['group', 'expenses', 'settlement', 'stats'].forEach((key) => {
    queryClient.invalidateQueries({ queryKey: [key, id] });
  });
}
