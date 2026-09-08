from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0020_aboutpagesettings_leader_4_bio_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='partner',
            name='display_order',
            field=models.PositiveIntegerField(default=0, help_text='Lower numbers appear first within each logo group.'),
        ),
        migrations.AlterModelOptions(
            name='partner',
            options={
                'ordering': ['partner_type', 'display_order', '-featured', 'name'],
                'verbose_name': 'Partnership - Partner/Sponsor',
                'verbose_name_plural': 'Partnership - Partners/Sponsors',
            },
        ),
    ]