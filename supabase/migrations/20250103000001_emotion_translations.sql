-- ============================================================================
-- Vietnamese labels for the emotion taxonomy.
--
-- IDs stay stable for model prompts and joins. These columns are display-only.
-- Safe to re-run.
-- ============================================================================

alter table public.emotions
  add column if not exists name_vi text,
  add column if not exists definition_vi text,
  add column if not exists sounds_like_vi text;

update public.emotions as e
set
  name_vi = v.name_vi,
  definition_vi = v.definition_vi,
  sounds_like_vi = v.sounds_like_vi
from (
  values
    ('joyful',     'Vui vẻ / Hân hoan',                 'Niềm vui tươi sáng, phấn khởi và sảng khoái',           'Pop major sôi động, nhịp nhanh'),
    ('euphoric',   'Hưng phấn / Bùng nổ',               'Khoái cảm tột đỉnh, hưng phấn mãnh liệt',               'Drop EDM lễ hội, anthem sân vận động'),
    ('triumphant', 'Chiến thắng / Hào hùng',            'Cảm giác chiến thắng, vươn cao và tự hào',              'Kèn đồng điện ảnh, cao trào dàn nhạc'),
    ('erotic',     'Gợi cảm / Khoái cảm',               'Ham muốn chậm rãi, quyến rũ và gần gũi thể xác',        'R&B chậm, giọng hát thì thầm'),
    ('tender',     'Dịu dàng / Trìu mến',               'Trìu mến ấm áp, dịu dàng và quan tâm',                  'Ballad acoustic nhẹ, hát ru'),
    ('nostalgic',  'Hoài niệm / Luyến tiếc',            'Nỗi nhớ ngọt ngào xen lẫn tiếc nuối về quá khứ',        'Nhạc xưa, torch song, standard cũ'),
    ('dreamy',     'Mơ màng / Huyền ảo',                'Mơ hồ, lơ lửng, như tan vào cõi mộng',                  'Ambient, shoegaze, pad ngập reverb'),
    ('serene',     'Thanh thản / Bình yên',             'Bình yên, tĩnh lặng và mãn nguyện',                     'Piano new-age, drone chậm'),
    ('relaxed',    'Thư giãn / Nhẹ nhàng',              'Thư thái, ít căng thẳng, nhịp điệu nhẹ nhàng',          'Lo-fi hip-hop chill, bossa nova'),
    ('awe',        'Kinh ngạc / Choáng ngợp',           'Choáng ngợp trước điều lớn lao, kỳ vĩ',                 'Hợp xướng dâng cao, post-rock sử thi'),
    ('funky',      'Sôi động / Bốc',                    'Vui tươi, dễ nhảy, tràn đầy năng lượng',                'Funk, disco, soul sôi động'),
    ('humorous',   'Hài hước / Tinh nghịch',            'Tinh nghịch, hài hước, vui nhộn',                       'Nhạc hoạt hình, bài hát novelty'),
    ('bittersweet','Ngọt ngào xen cay đắng / Bâng khuâng', 'Vừa đẹp vừa đau, nỗi buồn dịu nhẹ',                  'Folk minor với hòa âm ấm'),
    ('sad',        'Buồn / U sầu',                      'Đau buồn, u sầu, tâm trạng trầm xuống',                 'Piano minor chậm, blues'),
    ('brooding',   'Trầm tư / Suy tưởng',               'Tối tăm, nội tâm, suy nghĩ nặng nề',                    'Post-punk chậm, trip-hop u tối'),
    ('tense',      'Căng thẳng / Lo âu',                'Bất an, bồn chồn, linh cảm xấu',                        'Dây đàn nghịch phách, bộ gõ tích tắc'),
    ('angry',      'Giận dữ / Hung hãn',                'Thù địch, mạnh mẽ, giận dữ đối đầu',                   'Metal distorted, punk hardcore'),
    ('fearful',    'Sợ hãi / Rùng rợn',                 'Sợ hãi, lo lắng, rùng mình',                            'Âm thanh phim kinh dị, cụm âm nghịch'),
    ('defiant',    'Bất khuất / Phản kháng',            'Bạo dạn, chống đối, năng lượng phản kháng',             'Rock phản kháng, hô hào punk'),
    ('neutral',    'Trung tính / Nền',                  'Trung tính, phẳng lặng, mang tính nền',                  'Nhạc nền Muzak, tone tối giản')
) as v(id, name_vi, definition_vi, sounds_like_vi)
where e.id = v.id;
