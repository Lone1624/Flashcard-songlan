"""为细胞生物学 CSV 添加提示和难度列"""
with open('public/cellbiology.csv', 'r', encoding='utf-8') as f:
    lines = [l.strip() for l in f if l.strip()]

hints = [
    '五方面','病毒大小','细胞大小','光镜极限','电镜极限',
    '目镜+物镜','光源+聚光镜','分辨率','最小距离','阿贝公式',
    '波长λ','N.A.公式','介质折射率','镜口角','缩短波长',
    '增大N.A.','只大不清','物镜在下','切片','活细胞',
    '相位差→振幅差','环状光阑+相差板','Nomarski','平面偏振光','挡光片',
    '反射和衍射','定性定位','波长更长','激发+阻断','GFP',
    '融合表达','LSCM','同点聚焦','共焦小孔','光学切片',
    '0.2μm','超高分辨率荧光','隐失波','100-200nm','STORM',
    '受激发射损耗','旋转和移动','电子波长','TEM','SEM',
    '电磁透镜','高度真空','0.01-0.9nm','100nm以下','免疫化学',
    '小颗粒','背景染色','膜断裂面','低温电子','立体感强',
    '隧道效应','多种环境','超离心','沉降速度','沉降带',
    '抗原抗体','蛋白质分析','核酸定位','0.1-0.3μm','0.5-5.0μm',
    '0.2mm','准焦螺旋','恩斯特·鲁斯卡','10⁻⁸s','1.4-1.7倍',
    '光疏介质','接受角','中间镜','胶体金','微管运输',
]

diffs = [
    'medium','easy','easy','easy','easy','easy','easy','easy','medium','hard',
    'medium','hard','medium','medium','medium','medium','medium','medium','easy','medium',
    'hard','hard','medium','medium','medium','medium','medium','medium','medium','easy',
    'medium','easy','medium','medium','medium','medium','hard','hard','hard','hard',
    'hard','hard','medium','easy','easy','medium','medium','medium','medium','hard',
    'medium','medium','medium','medium','easy','hard','medium','medium','medium','medium',
    'medium','medium','medium','easy','easy','easy','medium','medium','medium','medium',
    'medium','medium','medium','medium','medium',
]

out = []
for i, line in enumerate(lines):
    idx = line.index(',')
    q = line[:idx]
    a = line[idx+1:]
    h = hints[i] if i < len(hints) else ''
    d = diffs[i] if i < len(diffs) else 'medium'
    out.append(f'{q},{a},{h},{d}')

with open('public/cellbiology.csv', 'w', encoding='utf-8') as f:
    f.write('\n'.join(out) + '\n')
print(f'Done, {len(out)} cards')
