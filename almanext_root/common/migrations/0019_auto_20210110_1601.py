# Generated by Django 2.2.10 on 2021-01-10 16:01

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('common', '0018_emissionline'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='emissionline',
            name='em_id',
        ),
        migrations.AddField(
            model_name='emissionline',
            name='emission',
            field=models.CharField(default=0, max_length=25),
            preserve_default=False,
        ),
    ]